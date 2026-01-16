import re
import os
from pathlib import Path

class FilePatcher:
    @staticmethod
    def apply_xml_changes(response_text, root_dir="."):
        """
        Parses <changes><change><file>...</file><content>...</content></change></changes>
        and writes files to disk.
        """
        print(f"[*] Analyzing response for code changes...")
        
        # Regex to find xml blocks
        # Note: This is a simplified regex for the specific format requested in the prompt
        pattern = re.compile(r'<change>.*?</change>', re.DOTALL)
        changes = pattern.findall(response_text)
        
        if not changes:
            print("[*] No XML code changes found in response.")
            return

        applied_count = 0
        
        for change_block in changes:
            try:
                # Extract filepath
                file_match = re.search(r'<file>(.*?)</file>', change_block, re.DOTALL)
                content_match = re.search(r'<content><!\[CDATA\[(.*?)\]\]></content>', change_block, re.DOTALL)
                
                if not file_match or not content_match:
                    continue
                    
                rel_path = file_match.group(1).strip()
                new_content = content_match.group(1)
                
                # Construct full path
                full_path = os.path.join(root_dir, rel_path)
                
                # Ensure directory exists
                os.makedirs(os.path.dirname(full_path), exist_ok=True)
                
                # Write file
                with open(full_path, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                    
                print(f"[+] Updated file: {rel_path}")
                applied_count += 1
                
            except Exception as e:
                print(f"[!] Error applying change: {e}")

        print(f"[*] Finished. {applied_count} files updated.")
