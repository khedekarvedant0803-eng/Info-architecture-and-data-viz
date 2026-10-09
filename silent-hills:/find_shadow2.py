from find_shadow import get_pixel, w, h
# The slots have a black drop shadow at the top and left.
# Let's find vertical lines of dark pixels.
print("Scanning vertical lines for Slot 1 left edge (x between 100 and 200)")
for x in range(120, 200):
    dark_count = 0
    for y in range(100, 300):
        b,g,r = get_pixel(x,y)
        if (r+g+b)/3 < 90:
            dark_count += 1
    if dark_count > 30:
        print(f"Possible left edge at x={x} (dark pixels={dark_count})")
        
print("Scanning vertical lines for Slot 2 left edge (x between 600 and 750)")
for x in range(650, 750):
    dark_count = 0
    for y in range(100, 300):
        b,g,r = get_pixel(x,y)
        if (r+g+b)/3 < 90:
            dark_count += 1
    if dark_count > 30:
        print(f"Possible left edge at x={x} (dark pixels={dark_count})")
