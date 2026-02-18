#!/bin/bash
# Run this script once you SSH into Render

echo "🔍 Searching for ALL database files..."
echo ""

# Find all .db files
echo "=== All .db files in /opt/render/project ==="
find /opt/render/project -name "*.db" -type f -ls 2>/dev/null

echo ""
echo "=== Checking database sizes and content ==="

# Check each database file
for db in $(find /opt/render/project -name "*.db" -type f 2>/dev/null); do
    echo ""
    echo "📄 Database: $db"
    echo "   Size: $(du -h "$db" | cut -f1)"
    echo "   Modified: $(stat -c %y "$db" 2>/dev/null || stat -f %Sm "$db" 2>/dev/null)"
    
    # Try to count users
    count=$(sqlite3 "$db" "SELECT COUNT(*) FROM waitlist;" 2>/dev/null || echo "ERROR")
    
    if [ "$count" != "ERROR" ]; then
        echo "   Users: $count"
        
        if [ "$count" -eq 4 ]; then
            echo "   ✅ THIS IS YOUR DATABASE WITH 4 USERS!"
            echo ""
            echo "   User details:"
            sqlite3 "$db" "SELECT id, name, email, created_at FROM waitlist;"
        fi
    else
        echo "   ⚠️  Cannot read (might be empty or corrupted)"
    fi
done

echo ""
echo "=== Complete! ==="
