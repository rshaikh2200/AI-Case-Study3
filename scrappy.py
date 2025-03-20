import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from bs4 import BeautifulSoup
from fpdf import FPDF

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
    
    # Optional: Use a custom User-Agent to reduce chance of being blocked
    chrome_options = Options()
    chrome_options.add_argument("--headless")  # run in headless mode (no browser UI)
    chrome_options.add_argument(
        "--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36"
    )

    # Initialize the driver (make sure the 'chromedriver' is in your PATH)
    driver = webdriver.Chrome(options=chrome_options)

    # 1) Load the main listing page
    driver.get(listing_url)
    time.sleep(2)  # give the page a moment to load

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
    all_results = []
    for link in subpage_links:
        driver.get(link)
        time.sleep(2)  # wait for subpage to load

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

    # Close the browser
    driver.quit()

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
    results = scrape_psnet_selenium()

    # 2) Save data to a PDF
    save_to_pdf(results, "psnet_cases.pdf")
