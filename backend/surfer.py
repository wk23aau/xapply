import undetected_chromedriver as uc
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time
import base64

import os

PROFILE_DIR = os.path.join(os.path.dirname(__file__), "data", "profiles")

class JobSurfer:
    def __init__(self, headless=False, start_url="https://testdevjobs.com/"):
        print("[*] Initializing JobSurfer Body...")
        
        # Use persistent profile to save login sessions
        surfer_profile_dir = os.path.join(PROFILE_DIR, "surfer")
        
        # Auto-manage profile compatibility
        from utils.profile_manager import ensure_profile_compatibility
        ensure_profile_compatibility(surfer_profile_dir)
        
        options = uc.ChromeOptions()
        options.add_argument(f"--user-data-dir={surfer_profile_dir}")
        if headless:
            options.add_argument('--headless')
        self.driver = uc.Chrome(options=options)
        self.driver.set_window_size(1280, 900)
        
        # Navigate to start URL immediately
        if start_url:
            print(f"[*] Starting at {start_url}")
            self.driver.get(start_url)
            time.sleep(2)

    def navigate(self, url):
        print(f"[*] Navigating to {url}")
        self.driver.get(url)
        time.sleep(3) # Wait for load

    def capture_state(self):
        """
        Returns the current visual and structural state of the page.
        """
        # 1. Take Screenshot (Vision)
        screenshot_b64 = self.driver.get_screenshot_as_base64()
        
        # 2. Extract Text/DOM (Reading)
        clean_text = self.driver.execute_script("""
            return document.body.innerText;
        """)
        
        # 3. Extract interactive elements with selectors
        interactive_elements = self.driver.execute_script("""
            const elements = [];
            const allInteractive = document.querySelectorAll('a, button, input, textarea, select, [role="button"], [onclick]');
            
            allInteractive.forEach((el, i) => {
                // Skip hidden elements
                if (el.offsetParent === null && el.tagName !== 'INPUT') return;
                
                const tag = el.tagName.toLowerCase();
                const id = el.id ? '#' + el.id : null;
                const name = el.name ? tag + '[name="' + el.name + '"]' : null;
                const text = (el.innerText || el.value || el.placeholder || el.ariaLabel || '').trim().substring(0, 40);
                const href = el.href || null;
                const type = el.type || null;
                
                // Build best selector
                let selector = id || name || null;
                if (!selector && el.className) {
                    const classes = el.className.split(' ').filter(c => c && !c.includes(':'));
                    if (classes.length > 0) {
                        selector = tag + '.' + classes[0];
                    }
                }
                if (!selector) {
                    // Use nth-of-type as fallback
                    const siblings = el.parentElement ? el.parentElement.querySelectorAll(tag) : [];
                    const index = Array.from(siblings).indexOf(el) + 1;
                    selector = tag + ':nth-of-type(' + index + ')';
                }
                
                elements.push({ 
                    index: elements.length + 1,
                    tag, 
                    selector, 
                    text: text || '[no text]',
                    type,
                    href: href ? href.substring(0, 60) : null
                });
            });
            
            return elements.slice(0, 25); // Limit to 25 most relevant
        """)
        
        url = self.driver.current_url
        
        return {
            "url": url,
            "screenshot": screenshot_b64,
            "text_content": clean_text[:3000], # Reduced to make room for elements
            "interactive_elements": interactive_elements
        }

    def execute_action(self, action):
        """
        Executes a human-like action dictated by the agent.
        Action format: { "type": "click"|"type"|"scroll"|"navigate", "selector": "...", "value": "...", "url": "..." }
        """
        try:
            if action["type"] == "navigate":
                url = action.get("url", "")
                print(f"[*] Navigating to {url}")
                self.driver.get(url)
                time.sleep(3)  # Wait for page load
                
            elif action["type"] == "click":
                print(f"[*] Clicking {action.get('selector')}")
                el = WebDriverWait(self.driver, 5).until(
                    EC.element_to_be_clickable((By.CSS_SELECTOR, action["selector"]))
                )
                el.click()
                
            elif action["type"] == "type":
                print(f"[*] Typing into {action.get('selector')}")
                el = self.driver.find_element(By.CSS_SELECTOR, action["selector"])
                el.clear()
                el.send_keys(action["value"])
                
            elif action["type"] == "scroll":
                self.driver.execute_script("window.scrollBy(0, 500);")
                
            time.sleep(1) # Human pause
            return True
        except Exception as e:
            print(f"[!] Action failed: {e}")
            return False

    def close(self):
        self.driver.quit()
