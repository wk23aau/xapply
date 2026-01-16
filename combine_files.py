import os
import math

def get_code_files(root_dir):
    """
    recursively find code files, ignoring typical ignore directories.
    """
    code_extensions = {
        '.py', '.tsx', '.ts', '.js', '.jsx', 
        '.html', '.css', '.json', '.md', 
        '.txt', '.yml', '.yaml'
    }
    
    ignore_dirs = {
        'node_modules', '.git', '__pycache__', 
        'dist', 'build', '.vscode', '.idea', 'venv', 'env'
    }
    
    file_list = []
    
    for root, dirs, files in os.walk(root_dir):
        # Modify dirs in-place to skip ignored directories
        dirs[:] = [d for d in dirs if d not in ignore_dirs]
        
        for file in files:
            ext = os.path.splitext(file)[1].lower()
            if ext in code_extensions:
                # Avoid including the output files themselves or this script
                if file.startswith('combined_code_') or file == 'combine_files.py':
                    continue
                    
                full_path = os.path.join(root, file)
                file_list.append(full_path)
                
    return file_list

def combine_files(file_list, chunk_size=5):
    """
    Combine files into text files, 'chunk_size' files per output file.
    """
    total_files = len(file_list)
    num_chunks = math.ceil(total_files / chunk_size)
    
    print(f"Found {total_files} files. Creating {num_chunks} output files...")
    
    for i in range(num_chunks):
        chunk = file_list[i * chunk_size : (i + 1) * chunk_size]
        output_filename = f"combined_code_{i + 1}.txt"
        
        with open(output_filename, 'w', encoding='utf-8') as outfile:
            for file_path in chunk:
                try:
                    rel_path = os.path.relpath(file_path)
                    outfile.write(f"{'='*50}\n")
                    outfile.write(f"FILE: {rel_path}\n")
                    outfile.write(f"{'='*50}\n\n")
                    
                    with open(file_path, 'r', encoding='utf-8', errors='replace') as infile:
                        outfile.write(infile.read())
                        
                    outfile.write("\n\n")
                except Exception as e:
                    outfile.write(f"Error reading file {file_path}: {e}\n\n")
        
        print(f"Created {output_filename} with {len(chunk)} files.")

if __name__ == "__main__":
    current_dir = os.getcwd()
    files = get_code_files(current_dir)
    combine_files(files)
    print("Done.")
