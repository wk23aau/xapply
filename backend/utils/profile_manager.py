import os
import shutil
import time
import json
import socket
import getpass

def ensure_profile_compatibility(profile_path):
    """
    Checks if the profile was created on this system. 
    If not (or if FRESH_BROWSER is set), cleans it to prevent hangs.
    """
    # 1. Check explicit force clean flag
    if os.getenv("FRESH_BROWSER", "false").lower() == "true":
        print("[*] FRESH_BROWSER flag detected. Cleaning profile...")
        clean_profile(profile_path)
        _write_meta(profile_path)
        return

    # 2. Check system signature
    meta_path = os.path.join(profile_path, "profile_meta.json")
    current_sig = {
        "hostname": socket.gethostname(),
        "user": getpass.getuser()
    }
    
    if os.path.exists(meta_path):
        try:
            with open(meta_path, 'r') as f:
                saved_sig = json.load(f)
            
            if (saved_sig.get("hostname") != current_sig["hostname"] or 
                saved_sig.get("user") != current_sig["user"]):
                print(f"[*] System change detected ({saved_sig.get('hostname')} -> {current_sig['hostname']}). Cleaning profile...")
                clean_profile(profile_path)
            else:
                # Same system, all good
                return
        except Exception as e:
            print(f"[!] Error reading profile meta: {e}. Cleaning just in case.")
            clean_profile(profile_path)
    else:
        # No meta file? Profile might have user's saved login (Google, etc.)
        # Just add the meta file instead of cleaning - preserve user sessions
        if os.path.exists(profile_path) and os.listdir(profile_path):
             print("[*] No profile metadata found. Adding meta to existing profile (preserving login sessions)...")
             # Don't clean - just add meta file
    
    # 3. Create/Update meta
    if not os.path.exists(profile_path):
        os.makedirs(profile_path, exist_ok=True)
    _write_meta(profile_path)

def _write_meta(profile_path):
    """Writes the current system signature to the profile."""
    try:
        os.makedirs(profile_path, exist_ok=True)
        meta_path = os.path.join(profile_path, "profile_meta.json")
        data = {
            "hostname": socket.gethostname(),
            "user": getpass.getuser(),
            "last_used": time.time()
        }
        with open(meta_path, 'w') as f:
            json.dump(data, f)
    except Exception as e:
        print(f"[!] Failed to write profile meta: {e}")


def clean_profile(profile_path):
    """
    Safely removes the profile directory if it exists.
    Retries up to 3 times in case of file locks.
    """
    if not os.path.exists(profile_path):
        print(f"[*] Profile path does not exist, skipping clean: {profile_path}")
        return True

    print(f"[*] Cleaning profile: {profile_path}")
    
    # Try to rename first to move it out of the way immediately (atomic-ish)
    trash_path = f"{profile_path}_trash_{int(time.time())}"
    
    try:
        if os.path.exists(profile_path):
            os.rename(profile_path, trash_path)
            print(f"[*] Moved profile to trash: {trash_path}")
            # Now try to delete the trash in background/best-effort
            shutil.rmtree(trash_path, ignore_errors=True)
            return True
    except Exception as e:
        print(f"[!] Could not move profile (locked?): {e}")
        
    # Fallback to direct delete loop
    for i in range(3):
        try:
            if os.path.exists(profile_path):
                shutil.rmtree(profile_path)
            print(f"[*] Profile cleaned: {profile_path}")
            return True
        except Exception as e:
            print(f"[!] proper handling of profile clean failed (attempt {i+1}/3): {e}")
            time.sleep(1)
            
    return False
