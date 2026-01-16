import undetected_chromedriver as uc
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.keys import Keys
import time


def run_automation():
    """
    Complete automation for Model Playground with automated Google login.
    """
    
    options = uc.ChromeOptions()
    options.add_argument("--start-maximized")
    options.add_argument("--disable-notifications")
    options.add_argument("--disable-popup-blocking")
    
    driver = uc.Chrome(options=options)
    wait = WebDriverWait(driver, 20)
    
    # Login credentials
    EMAIL = "mistrcrunchy"
    PASSWORD = "fb3bbc2c"
    
    try:
        # ========================================
        # Step 1: Navigate to Playground
        # ========================================
        print("🌐 Navigating to Model Playground...")
        driver.get("https://app.outlier.ai/playground")
        time.sleep(3)
        
        # ========================================
        # Step 2: Click Google Login Button
        # ========================================
        print("🔐 Looking for Google login button...")
        
        try:
            google_selectors = [
                "//button[contains(text(), 'Google')]",
                "//button[contains(., 'Google')]",
                "//*[contains(text(), 'Continue with Google')]",
                "//*[contains(text(), 'Sign in with Google')]",
                "//button[contains(@class, 'google')]",
                "//*[@data-testid='google-login']"
            ]
            
            google_btn = None
            for selector in google_selectors:
                try:
                    google_btn = wait.until(
                        EC.element_to_be_clickable((By.XPATH, selector))
                    )
                    break
                except:
                    continue
            
            if google_btn:
                google_btn.click()
                print("✅ Clicked Google login button!")
                time.sleep(3)
            else:
                print("⚠️ Google button not found...")
                
        except Exception as e:
            print(f"⚠️ Google button issue: {e}")
        
        # ========================================
        # Step 3: Handle Google Login
        # ========================================
        print("🔑 Handling Google authentication...")
        
        main_window = driver.current_window_handle
        time.sleep(2)
        all_windows = driver.window_handles
        
        if len(all_windows) > 1:
            print("📌 Switching to Google login popup...")
            for window in all_windows:
                if window != main_window:
                    driver.switch_to.window(window)
                    break
        
        # Enter Email
        print("📧 Entering email...")
        try:
            email_field = wait.until(
                EC.presence_of_element_located((By.XPATH, "//input[@type='email']"))
            )
            email_field.clear()
            email_field.send_keys(EMAIL)
            time.sleep(1)
            email_field.send_keys(Keys.ENTER)
            print("✅ Email entered!")
            time.sleep(3)
        except Exception as e:
            print(f"⚠️ Email field issue: {e}")
        
        # Enter Password
        print("🔑 Entering password...")
        try:
            password_field = wait.until(
                EC.presence_of_element_located((By.XPATH, "//input[@type='password']"))
            )
            password_field.clear()
            password_field.send_keys(PASSWORD)
            time.sleep(1)
            password_field.send_keys(Keys.ENTER)
            print("✅ Password entered!")
            time.sleep(5)
        except Exception as e:
            print(f"⚠️ Password field issue: {e}")
        
        # Switch back to main window
        if len(all_windows) > 1:
            print("📌 Switching back to main window...")
            driver.switch_to.window(main_window)
            time.sleep(3)
        
        print("✅ Login process completed!")
        
        # ========================================
        # Step 4: Handle Onboarding Redirect
        # ========================================
        print("🔄 Checking for redirects...")
        time.sleep(3)
        
        if "onboarding" in driver.current_url:
            print("⚠️ Redirected to onboarding! Going back to playground...")
            driver.get("https://app.outlier.ai/playground")
            time.sleep(3)
        
        # ========================================
        # Step 5: Click Model Picker Button
        # ========================================
        print("🔽 Opening model selector dropdown...")
        
        model_picker_button = wait.until(
            EC.element_to_be_clickable((By.CSS_SELECTOR, "[data-testid='model-picker-button']"))
        )
        model_picker_button.click()
        print("✅ Model picker dropdown opened!")
        time.sleep(2)
        
        # ========================================
        # Step 6: Select Claude Opus 4.5
        # ========================================
        print("🤖 Selecting Claude Opus 4.5...")
        
        model_card = wait.until(
            EC.element_to_be_clickable((By.CSS_SELECTOR, "[data-testid='model-card-claude-opus-4-5-20251101']"))
        )
        model_card.click()
        print("✅ Claude Opus 4.5 selected!")
        time.sleep(2)
        
        # ========================================
        # Step 7: Type Message to Activate Send Button
        # ========================================
        print("💬 Typing message...")
        
        textarea = wait.until(
            EC.presence_of_element_located((By.TAG_NAME, "textarea"))
        )
        textarea.clear()
        
        # Type message with space at end to activate send button
        message = "Hello Testin "
        textarea.send_keys(message)
        print(f"✅ Message typed: '{message}'")
        time.sleep(1)
        
        # ========================================
        # Step 8: Wait for Send Button to be ENABLED
        # ========================================
        print("⏳ Waiting for send button to be enabled...")
        
        # Wait for the button to NOT have disabled attribute and have cursor-pointer class
        # The enabled button has: class="...cursor-pointer" and NO disabled attribute
        # The disabled button has: data-disabled="true", disabled="", cursor-not-allowed
        
        send_button = None
        max_attempts = 10
        attempt = 0
        
        while attempt < max_attempts:
            try:
                # Find the button with the paper-plane-top icon
                buttons = driver.find_elements(By.CSS_SELECTOR, "button.rt-IconButton")
                
                for btn in buttons:
                    # Check if button contains the paper plane SVG
                    try:
                        btn.find_element(By.CSS_SELECTOR, "svg.fa-paper-plane-top")
                        
                        # Check if button is enabled (has cursor-pointer class and no disabled attribute)
                        classes = btn.get_attribute("class")
                        is_disabled = btn.get_attribute("disabled")
                        data_disabled = btn.get_attribute("data-disabled")
                        
                        print(f"   Attempt {attempt + 1}: disabled={is_disabled}, data-disabled={data_disabled}")
                        
                        if "cursor-pointer" in classes and is_disabled is None and data_disabled != "true":
                            send_button = btn
                            print("✅ Send button is now ENABLED!")
                            break
                            
                    except:
                        continue
                
                if send_button:
                    break
                    
            except Exception as e:
                print(f"   Attempt {attempt + 1}: Still waiting... ({e})")
            
            attempt += 1
            time.sleep(0.5)
            
            # Try adding another character to ensure button activates
            if attempt == 5:
                print("   Adding extra character to activate button...")
                textarea.send_keys(" ")
        
        # ========================================
        # Step 9: Click the Enabled Send Button
        # ========================================
        if send_button:
            print("📤 Clicking send button...")
            send_button.click()
            print("✅ Message sent successfully!")
        else:
            # Fallback methods
            print("⚠️ Could not find enabled button, trying alternatives...")
            
            # Try 1: Find by cursor-pointer class
            try:
                enabled_btn = driver.find_element(By.CSS_SELECTOR, "button.rt-IconButton.cursor-pointer")
                enabled_btn.click()
                print("✅ Sent via cursor-pointer selector!")
            except:
                # Try 2: JavaScript click
                try:
                    btn = driver.find_element(By.CSS_SELECTOR, "button.rt-IconButton svg.fa-paper-plane-top")
                    parent_btn = btn.find_element(By.XPATH, "./..")
                    driver.execute_script("arguments[0].click();", parent_btn)
                    print("✅ Sent via JavaScript click!")
                except:
                    # Try 3: Press Enter
                    textarea.send_keys(Keys.ENTER)
                    print("✅ Sent via Enter key!")
        
        # ========================================
        # Step 10: Wait for Response
        # ========================================
        print("⏳ Waiting for response...")
        time.sleep(10)
        
        # ========================================
        # Done!
        # ========================================
        print("\n" + "="*50)
        print("✅ AUTOMATION COMPLETED SUCCESSFULLY!")
        print("="*50)
        
        input("\nPress Enter to close browser...")
        
    except Exception as e:
        print(f"\n❌ Error occurred: {e}")
        screenshot_name = f"error_screenshot_{int(time.time())}.png"
        driver.save_screenshot(screenshot_name)
        print(f"📸 Screenshot saved: {screenshot_name}")
        input("\nPress Enter to close browser...")
        
    finally:
        driver.quit()
        print("🔒 Browser closed.")


# ========================================
# Helper Function: Wait for Button Enable
# ========================================
def wait_for_send_button_enabled(driver, timeout=10):
    """
    Waits for the send button to become enabled.
    Returns the button element when enabled, or None if timeout.
    """
    start_time = time.time()
    
    while time.time() - start_time < timeout:
        try:
            # Find all icon buttons
            buttons = driver.find_elements(By.CSS_SELECTOR, "button.rt-IconButton")
            
            for btn in buttons:
                # Check for paper plane icon
                try:
                    btn.find_element(By.CSS_SELECTOR, "svg.fa-paper-plane-top")
                except:
                    continue
                
                # Check if enabled
                classes = btn.get_attribute("class") or ""
                disabled = btn.get_attribute("disabled")
                data_disabled = btn.get_attribute("data-disabled")
                
                is_enabled = (
                    "cursor-pointer" in classes and
                    disabled is None and
                    data_disabled != "true"
                )
                
                if is_enabled:
                    return btn
                    
        except:
            pass
        
        time.sleep(0.3)
    
    return None


if __name__ == "__main__":
    print("="*50)
    print("🚀 Model Playground Automation")
    print("="*50)
    print()
    run_automation()