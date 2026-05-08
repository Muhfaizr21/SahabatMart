
import sys
import re

def check_div_balance(filename):
    with open(filename, 'r') as f:
        content = f.read()
    
    # Remove everything inside {} to avoid matching > inside JS expressions
    # This is a bit tricky with nested braces, but let's try a simple version
    content_no_js = ""
    brace_count = 0
    for char in content:
        if char == '{':
            brace_count += 1
        elif char == '}':
            brace_count -= 1
        elif brace_count == 0:
            content_no_js += char
            
    # Now find tags in the JS-free content
    tags = re.finditer(r'<(/?div)([^>]*)(/?)>', content_no_js)
    
    stack = []
    for match in tags:
        tag_type = match.group(1)
        is_self_closing = match.group(3) == '/'
        
        if tag_type == 'div':
            if is_self_closing:
                continue
            stack.append(True)
        elif tag_type == '/div':
            if stack:
                stack.pop()
            else:
                print(f"Extra closing div found")
                
    if stack:
        print(f"Missing {len(stack)} closing div tags")
    else:
        print("All divs are balanced (in JS-free content)")

check_div_balance(sys.argv[1])
