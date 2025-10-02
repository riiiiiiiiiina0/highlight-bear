import os
import re
from playwright.sync_api import sync_playwright, expect

def get_extension_id(context):
    """
    Retrieves the extension's ID by navigating to chrome://extensions
    and finding the extension by its name.
    """
    # Open a new page to the extensions page
    page = context.new_page()
    page.goto("chrome://extensions")

    # The extension name is defined in the manifest
    extension_name = "Highlight Bear"

    # Find the extension card by its name and extract the ID from the host element
    # Note: This relies on the internal structure of the chrome://extensions page
    # and might need updating if Chrome changes it.
    extensions_manager = page.locator("extensions-manager")

    # The ID is an attribute on the extensions-item element
    item_locator = extensions_manager.locator(f"extensions-item[name='{extension_name}']")

    extension_id = item_locator.get_attribute("id")

    if not extension_id:
        raise Exception(f"Could not find extension with name: {extension_name}")

    page.close()
    return extension_id

def test_prefill_from_url():
    # Define paths
    path_to_extension = os.path.abspath('.')
    user_data_dir = "/tmp/test-user-data-dir"

    with sync_playwright() as p:
        # Launch a browser with the extension loaded
        context = p.chromium.launch_persistent_context(
            user_data_dir,
            headless=False, # Run in headed mode to access chrome:// URLs
            args=[
                f"--disable-extensions-except={path_to_extension}",
                f"--load-extension={path_to_extension}",
            ],
        )

        try:
            extension_id = get_extension_id(context)

            # --- 1. Test the main functionality ---
            # Simulate the action of the background script by opening the options page
            # with the correct parameters.
            test_url = "https://github.com/microsoft/playwright-python"
            test_title = "microsoft/playwright-python: Python version of the Playwright testing and automation library."

            # Construct the URL for the options page
            options_page_url = f"chrome-extension://{extension_id}/src/options/options.html"
            query_params = f"?action=new_rule&url={test_url}&title={test_title}"

            # Navigate to the options page with parameters
            page = context.new_page()
            page.goto(options_page_url + query_params)

            # --- 2. Verify the result ---
            # Check if the "Create New Rule" modal is open and the fields are pre-filled.
            modal_title = page.locator("#modalTitle")
            expect(modal_title).to_have_text("Create New Rule")

            rule_name_input = page.locator("#ruleName")
            expect(rule_name_input).to_have_value(test_title)

            url_pattern_input = page.locator("#urlPattern")
            expect(url_pattern_input).to_have_value(test_url)

            # --- 3. Take a screenshot ---
            screenshot_path = "jules-scratch/verification/verification.png"
            page.screenshot(path=screenshot_path)
            print(f"Screenshot saved to {screenshot_path}")

        finally:
            # --- 4. Clean up ---
            context.close()

# Run the test
if __name__ == "__main__":
    test_prefill_from_url()