import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.common.exceptions import WebDriverException, InvalidSessionIdException
from bs4 import BeautifulSoup
from fpdf import FPDF

# DeathByCaptcha import
import deathbycaptcha

# Configure DeathByCaptcha account credentials
DBC_USERNAME = "rshaikh22"  # Replace with your DeathByCaptcha username
DBC_PASSWORD = "Mrshaikh!0786"  # Replace with your DeathByCaptcha password

def solve_captcha(driver, filename="captcha.png"):
    """Helper function to solve CAPTCHA if present on the page"""
    captcha_image = None
    possible_captcha_imgs = driver.find_elements(By.XPATH, "//img[contains(@src, 'captcha')]")
    if possible_captcha_imgs:
        captcha_image = possible_captcha_imgs[0]

    if captcha_image:
        # Screenshot the CAPTCHA
        captcha_image.screenshot(filename)

        # Initialize DeathByCaptcha client
        client = deathbycaptcha.SocketClient(DBC_USERNAME, DBC_PASSWORD)

        try:
            # Submit the CAPTCHA image to DeathByCaptcha
            captcha = client.decode(filename, timeout=60)
            if captcha:
                # Extract the text from the solution
                captcha_text = captcha.get("text", "")
                print(f"[INFO] Solved CAPTCHA: {captcha_text}")

                # Locate the input field for the CAPTCHA
                captcha_input = driver.find_elements(By.XPATH, "//input[contains(@name, 'captcha') or contains(@id, 'captcha')]")
                if captcha_input:
                    captcha_input[0].clear()
                    captcha_input[0].send_keys(captcha_text)

                    # Find and click submit button
                    submit_button = driver.find_elements(By.XPATH, "//button[contains(text(), 'Submit')]")
                    if submit_button:
                        submit_button[0].click()
                        # Wait for page to load after submitting
                        time.sleep(2)
                return True
            else:
                print("[ERROR] Could not solve CAPTCHA.")
                return False
        except deathbycaptcha.AccessDeniedException:
            print("[ERROR] Access to DBC API denied. Check credentials/balance.")
            return False
    return True  # No CAPTCHA found or CAPTCHA solved successfully

def initialize_driver():
    """Initialize and return a new Chrome WebDriver"""
    chrome_options = Options()
    chrome_options.add_argument("--headless")  # run in headless mode
    chrome_options.add_argument("--no-sandbox")  # required for some environments
    chrome_options.add_argument("--disable-dev-shm-usage")  # required for some environments
    chrome_options.add_argument(
        "--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36"
    )
    
    return webdriver.Chrome(options=chrome_options)

def scrape_psnet_selenium():
    """
    Uses Selenium + BeautifulSoup to:
      1) Load the PSNet case-study listing page.
      2) Extract subpage links from div.h5.
      3) Visit each subpage to collect:
         - h1 title
         - All h2 titles
         - Paragraphs under h2#The-Case until next h2
      Returns a list of dictionaries containing the data.
    """

    listing_url = "https://psnet.ahrq.gov/webmm-case-studies?page=1&items_per_page=100"
    base_url = "https://psnet.ahrq.gov"

    # Initialize the driver
    driver = initialize_driver()
    
    all_results = []

    try:
        # 1) Load the main listing page
        driver.get(listing_url)
        time.sleep(2)  # give the page a moment to load

        # Handle CAPTCHA if present
        if not solve_captcha(driver):
            driver.quit()
            return []

        # 2) Parse via BeautifulSoup
        soup = BeautifulSoup(driver.page_source, "html.parser")

        # Find the divs with class="h5"
        links_divs = soup.find_all("div", class_="h5")

        # Collect subpage links
        subpage_links = []
        for div in links_divs:
            a_tag = div.find("a")
            if a_tag and a_tag.get("href"):
                subpage_links.append(base_url + a_tag["href"])

        # 3) Visit each subpage, parse, and extract data
        for i, link in enumerate(subpage_links):
            print(f"Processing link {i+1}/{len(subpage_links)}: {link}")
            
            try:
                # Navigate to the subpage
                driver.get(link)
                time.sleep(2)  # wait for subpage to load
                
                # Handle CAPTCHA on subpage if present
                if not solve_captcha(driver, f"subpage_captcha_{i}.png"):
                    continue
                
                sub_soup = BeautifulSoup(driver.page_source, "html.parser")

                # Extract the H1
                h1_tag = sub_soup.find("h1")
                h1_text = h1_tag.get_text(strip=True) if h1_tag else ""

                # Extract all H2
                h2_tags = sub_soup.find_all("h2")
                h2_texts = [h2.get_text(strip=True) for h2 in h2_tags]

                # Extract paragraphs between h2#The-Case and the next h2
                the_case_h2 = sub_soup.find("h2", id="The-Case")
                the_case_paragraphs = []
                if the_case_h2:
                    # Look at each sibling until the next H2
                    for sibling in the_case_h2.next_siblings:
                        if sibling.name == "h2":
                            break
                        if sibling.name == "p":
                            the_case_paragraphs.append(sibling.get_text(strip=True))

                # Store results
                all_results.append({
                    "h1_title": h1_text,
                    "h2_titles": h2_texts,
                    "the_case_paragraphs": the_case_paragraphs
                })
                
            except (WebDriverException, InvalidSessionIdException) as e:
                print(f"[ERROR] WebDriver exception on {link}: {str(e)}")
                # If we hit an error, reinitialize the driver and continue
                driver.quit()
                driver = initialize_driver()
                time.sleep(1)
                continue
    
    except Exception as e:
        print(f"[ERROR] Unexpected error: {str(e)}")
    
    finally:
        # Always make sure to close the driver
        try:
            driver.quit()
        except:
            pass
        
    return all_results

def save_to_pdf(results, filename="psnet_cases.pdf"):
    """
    Takes the list of scraped results and saves them to a PDF using FPDF.
    """
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Arial", size=12)

    for idx, item in enumerate(results, start=1):
        # Case heading
        pdf.multi_cell(0, 10, f"Case {idx}: {item['h1_title']}")
        pdf.ln(5)

        # H2 titles
        if item["h2_titles"]:
            pdf.cell(200, 10, "H2 Titles:", ln=1)
            for h2 in item["h2_titles"]:
                pdf.multi_cell(0, 10, f" - {h2}")
            pdf.ln(5)

        # Paragraphs under "The Case"
        if item["the_case_paragraphs"]:
            pdf.cell(200, 10, "Paragraphs under 'The Case':", ln=1)
            for para in item["the_case_paragraphs"]:
                pdf.multi_cell(0, 10, para)
                pdf.ln(2)

        # Add some space before next case
        pdf.ln(10)

    pdf.output(filename)
    print(f"PDF saved as '{filename}'")

if __name__ == "__main__":
    # 1) Scrape data via Selenium
    print("Starting scraping process...")
    results = scrape_psnet_selenium()
    print(f"Scraping complete. Found {len(results)} cases.")
    
    # 2) Save data to a PDF
    if results:
        save_to_pdf(results, "psnet_cases.pdf")
    else:
        print("No results to save to PDF.")
