import time
import sys
import os
import logging
from datetime import datetime
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.common.exceptions import WebDriverException, TimeoutException, InvalidSessionIdException
from webdriver_manager.chrome import ChromeDriverManager
from bs4 import BeautifulSoup
from fpdf import FPDF

# Set up logging to file and console
def setup_logging(log_filename='scraper_log.txt'):
    log_formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)
    
    # File handler (logs to file)
    file_handler = logging.FileHandler(log_filename, mode='w')
    file_handler.setFormatter(log_formatter)
    root_logger.addHandler(file_handler)
    
    # Console handler (logs to console)
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(log_formatter)
    root_logger.addHandler(console_handler)
    
    logging.info(f"Logging initialized to {log_filename}")
    return root_logger

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
    logging.info("Starting PSNet scraping process")
    
    listing_url = "https://psnet.ahrq.gov/webmm-case-studies?page=1&items_per_page=100"
    base_url = "https://psnet.ahrq.gov"
    
    # Configure Chrome options for stable operation
    logging.info("Configuring Chrome options")
    chrome_options = Options()
    chrome_options.add_argument("--headless")
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--window-size=1920,1080")
    chrome_options.add_argument("--disable-extensions")
    chrome_options.add_argument("--proxy-server='direct://'")
    chrome_options.add_argument("--proxy-bypass-list=*")
    chrome_options.add_argument("--start-maximized")
    chrome_options.add_argument(
        "--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36"
    )
    
    # Initialize the driver with error handling
    driver = None
    results = []
    
    try:
        # Try using webdriver_manager for automatic chromedriver management
        try:
            logging.info("Initializing Chrome driver with webdriver_manager")
            service = Service(ChromeDriverManager().install())
            driver = webdriver.Chrome(service=service, options=chrome_options)
            logging.info("Chrome driver initialized successfully with webdriver_manager")
        except Exception as e:
            logging.warning(f"Could not use webdriver_manager: {e}")
            # Fallback to default Chrome driver initialization
            logging.info("Falling back to default Chrome driver initialization")
            driver = webdriver.Chrome(options=chrome_options)
            logging.info("Chrome driver initialized with default method")
        
        driver.set_page_load_timeout(30)  # Set timeout for page loads
        logging.info("Page load timeout set to 30 seconds")
        
        # 1) Load the main listing page
        logging.info(f"Loading main listing page: {listing_url}")
        driver.get(listing_url)
        time.sleep(3)  # give the page a moment to load
        logging.info(f"Main page loaded. Title: {driver.title}")
        
        # 2) Parse via BeautifulSoup
        logging.info("Parsing main page with BeautifulSoup")
        soup = BeautifulSoup(driver.page_source, "html.parser")
        
        # Find the divs with class="h5"
        links_divs = soup.find_all("div", class_="h5")
        
        if not links_divs:
            logging.warning("No links found on the listing page. The page structure may have changed.")
            logging.info(f"Page title: {driver.title}")
            
        # Collect subpage links
        subpage_links = []
        for div in links_divs:
            a_tag = div.find("a")
            if a_tag and a_tag.get("href"):
                subpage_links.append(base_url + a_tag["href"])
        
        logging.info(f"Found {len(subpage_links)} subpage links")
        
        # For testing, limit to first few links if needed
        # subpage_links = subpage_links[:3]  # Uncomment for testing with only 3 links
        # if limited, log it
        # logging.info(f"Limited to first 3 links for testing")
        
        # 3) Visit each subpage, parse, and extract data
        for i, link in enumerate(subpage_links):
            try:
                logging.info(f"Processing link {i+1}/{len(subpage_links)}: {link}")
                driver.get(link)
                time.sleep(3)  # wait for subpage to load
                
                sub_soup = BeautifulSoup(driver.page_source, "html.parser")
                
                # Extract the H1
                h1_tag = sub_soup.find("h1")
                h1_text = h1_tag.get_text(strip=True) if h1_tag else f"Unknown Title {i+1}"
                logging.info(f"Page title: {h1_text}")
                
                # Extract all H2
                h2_tags = sub_soup.find_all("h2")
                h2_texts = [h2.get_text(strip=True) for h2 in h2_tags]
                logging.info(f"Found {len(h2_texts)} H2 headings")
                
                # Extract paragraphs between h2#The-Case and the next h2
                the_case_h2 = sub_soup.find("h2", id="The-Case")
                the_case_paragraphs = []
                
                if the_case_h2:
                    logging.info("Found 'The Case' section")
                    # Look at each sibling until the next H2
                    for sibling in the_case_h2.next_siblings:
                        if sibling.name == "h2":
                            break
                        if sibling.name == "p":
                            the_case_paragraphs.append(sibling.get_text(strip=True))
                else:
                    logging.warning("Could not find 'The Case' section")
                
                logging.info(f"Found {len(the_case_paragraphs)} paragraphs in 'The Case' section")
                
                # Store results
                results.append({
                    "h1_title": h1_text,
                    "h2_titles": h2_texts,
                    "the_case_paragraphs": the_case_paragraphs
                })
                
                logging.info(f"Successfully processed: {h1_text}")
                
            except (InvalidSessionIdException, WebDriverException) as e:
                logging.error(f"Session error on link {i+1}: {e}")
                
                # Attempt to recreate the driver
                try:
                    if driver:
                        try:
                            driver.quit()
                            logging.info("Chrome driver closed successfully")
                        except Exception as quit_error:
                            logging.warning(f"Error closing Chrome driver: {quit_error}")
                    
                    logging.info("Recreating WebDriver session...")
                    driver = webdriver.Chrome(options=chrome_options)
                    driver.set_page_load_timeout(30)
                    logging.info("New Chrome driver session created")
                    
                    # Try this link again
                    logging.info(f"Retrying link {i+1}...")
                    driver.get(link)
                    time.sleep(3)
                    logging.info("Retry page loaded")
                    
                    # Continue with the parsing as before
                    sub_soup = BeautifulSoup(driver.page_source, "html.parser")
                    h1_tag = sub_soup.find("h1")
                    h1_text = h1_tag.get_text(strip=True) if h1_tag else f"Unknown Title {i+1}"
                    h2_tags = sub_soup.find_all("h2")
                    h2_texts = [h2.get_text(strip=True) for h2 in h2_tags]
                    the_case_h2 = sub_soup.find("h2", id="The-Case")
                    the_case_paragraphs = []
                    
                    if the_case_h2:
                        for sibling in the_case_h2.next_siblings:
                            if sibling.name == "h2":
                                break
                            if sibling.name == "p":
                                the_case_paragraphs.append(sibling.get_text(strip=True))
                    
                    results.append({
                        "h1_title": h1_text,
                        "h2_titles": h2_texts,
                        "the_case_paragraphs": the_case_paragraphs
                    })
                    
                    logging.info(f"Retry successful for: {h1_text}")
                    
                except Exception as retry_error:
                    logging.error(f"Retry failed for link {i+1}: {retry_error}")
                    # Add a placeholder entry
                    results.append({
                        "h1_title": f"Error processing link {i+1}",
                        "h2_titles": [],
                        "the_case_paragraphs": [f"Error: {str(retry_error)}"]
                    })
            
            except Exception as other_error:
                logging.error(f"Other error on link {i+1}: {other_error}")
                # Add a placeholder entry
                results.append({
                    "h1_title": f"Error processing link {i+1}",
                    "h2_titles": [],
                    "the_case_paragraphs": [f"Error: {str(other_error)}"]
                })
    
    except Exception as e:
        logging.critical(f"Critical error in scraping process: {e}")
    
    finally:
        # Always attempt to close the driver
        if driver:
            try:
                driver.quit()
                logging.info("Chrome driver closed successfully")
            except Exception as quit_error:
                logging.warning(f"Error closing Chrome driver: {quit_error}")
    
    logging.info(f"Scraping completed. Collected data for {len(results)} pages.")
    return results

def save_to_pdf(results, filename="psnet_cases.pdf"):
    """
    Takes the list of scraped results and saves them to a PDF using FPDF.
    """
    logging.info(f"Starting PDF generation: {filename}")
    
    # If no results, create a simple error PDF
    if not results:
        logging.warning("No results to save to PDF")
        pdf = FPDF()
        pdf.add_page()
        pdf.set_font("Arial", size=12)
        pdf.cell(200, 10, "No data was scraped. Check the log file for errors.", ln=1)
        pdf.output(filename)
        logging.info(f"Empty PDF saved as '{filename}'")
        return
    
    try:
        # Create PDF instance
        logging.info("Creating PDF document")
        pdf = FPDF()
        pdf.set_auto_page_break(auto=True, margin=15)
        
        for idx, item in enumerate(results, start=1):
            logging.info(f"Adding case {idx} to PDF")
            pdf.add_page()
            
            # Case heading
            pdf.set_font("Arial", 'B', size=14)
            # Use a safe string conversion to avoid encoding issues
            title = f"Case {idx}: {item['h1_title']}"
            logging.info(f"Processing title: {title[:50]}..." if len(title) > 50 else f"Processing title: {title}")
            
            # Split long titles into multiple lines if needed
            if len(title) > 60:
                chunks = [title[i:i+60] for i in range(0, len(title), 60)]
                for chunk in chunks:
                    pdf.cell(0, 10, chunk, ln=1)
            else:
                pdf.cell(0, 10, title, ln=1)
            
            pdf.ln(5)
            
            # H2 titles
            if item["h2_titles"]:
                logging.info(f"Adding {len(item['h2_titles'])} H2 titles")
                pdf.set_font("Arial", 'B', size=12)
                pdf.cell(0, 10, "Headings:", ln=1)
                pdf.set_font("Arial", '', size=11)
                
                for h2_idx, h2 in enumerate(item["h2_titles"]):
                    # Safely handle text
                    safe_h2 = str(h2).encode('latin-1', errors='replace').decode('latin-1')
                    logging.debug(f"Adding H2 #{h2_idx+1}: {safe_h2[:30]}..." if len(safe_h2) > 30 else f"Adding H2 #{h2_idx+1}: {safe_h2}")
                    pdf.multi_cell(0, 8, f" - {safe_h2}")
                
                pdf.ln(5)
            
            # Paragraphs under "The Case"
            if item["the_case_paragraphs"]:
                logging.info(f"Adding {len(item['the_case_paragraphs'])} paragraphs from 'The Case'")
                pdf.set_font("Arial", 'B', size=12)
                pdf.cell(0, 10, "Case Description:", ln=1)
                pdf.set_font("Arial", '', size=10)
                
                for para_idx, para in enumerate(item["the_case_paragraphs"]):
                    # Safely handle text
                    safe_para = str(para).encode('latin-1', errors='replace').decode('latin-1')
                    logging.debug(f"Adding paragraph #{para_idx+1}: {safe_para[:30]}..." if len(safe_para) > 30 else f"Adding paragraph #{para_idx+1}: {safe_para}")
                    
                    # Break long paragraphs into smaller pieces
                    # FPDF has a limitation with very long strings
                    chunk_size = 200  # Adjust this value based on your needs
                    for i in range(0, len(safe_para), chunk_size):
                        chunk = safe_para[i:i+chunk_size]
                        pdf.multi_cell(0, 6, chunk)
                    
                    pdf.ln(4)
        
        # Save the PDF
        logging.info(f"Saving PDF to {filename}")
        pdf.output(filename)
        logging.info(f"PDF saved successfully as '{filename}'")
    
    except Exception as e:
        logging.error(f"Error creating PDF: {e}")
        
        # Fallback to a very simple PDF with minimal formatting
        try:
            logging.info("Attempting to create basic fallback PDF")
            basic_pdf = FPDF()
            basic_pdf.add_page()
            basic_pdf.set_font("Arial", size=10)
            
            basic_pdf.cell(200, 10, "Error with standard PDF generation. Basic version:", ln=1)
            basic_pdf.cell(200, 10, f"Error: {str(e)}", ln=1)
            basic_pdf.ln(10)
            
            for idx, item in enumerate(results, start=1):
                logging.debug(f"Adding basic entry for case {idx}")
                basic_pdf.cell(200, 8, f"Case {idx}", ln=1)
                
                # Only include minimal data
                if item.get("h1_title"):
                    safe_title = str(item["h1_title"])[:100].encode('latin-1', errors='replace').decode('latin-1')
                    basic_pdf.multi_cell(0, 8, safe_title)
                
                if idx % 5 == 0:  # Add a new page every 5 items
                    basic_pdf.add_page()
            
            fallback_filename = "basic_" + filename
            basic_pdf.output(fallback_filename)
            logging.info(f"Basic PDF saved as '{fallback_filename}'")
        
        except Exception as e2:
            logging.error(f"Even basic PDF generation failed: {e2}")
            
            # Last resort: Save the raw data to a text file
            try:
                logging.info("Attempting to save data as text file")
                text_filename = "scraped_data.txt"
                with open(text_filename, "w", encoding="utf-8") as f:
                    for idx, item in enumerate(results, start=1):
                        f.write(f"Case {idx}: {item.get('h1_title', 'No title')}\n\n")
                        if item.get("the_case_paragraphs"):
                            f.write("Case description:\n")
                            for para in item["the_case_paragraphs"]:
                                f.write(f"{para}\n\n")
                        f.write("="*50 + "\n\n")
                logging.info(f"Data saved to '{text_filename}'")
            except Exception as e3:
                logging.critical(f"All output methods failed: {e3}")

if __name__ == "__main__":
    # Create timestamp for log filename
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    log_filename = f"scraper_log_{timestamp}.txt"
    
    # Setup logging
    logger = setup_logging(log_filename)
    logging.info("="*50)
    logging.info("PSNet Web Scraper Starting")
    logging.info("="*50)
    
    try:
        # 1) Scrape data via Selenium
        results = scrape_psnet_selenium()
        
        # 2) Save data to a PDF
        if results:
            save_to_pdf(results, "psnet_cases.pdf")
        else:
            logging.warning("No results to save to PDF.")
    except Exception as e:
        logging.critical(f"Unhandled exception in main process: {e}")
    
    logging.info("="*50)
    logging.info("PSNet Web Scraper Completed")
    logging.info("="*50)
