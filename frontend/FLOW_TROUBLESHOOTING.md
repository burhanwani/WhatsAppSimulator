## Quick Test Guide

### Step 1: Make Sure Chat is Working
1. Open `http://localhost:5173`
2. Wait for "Initialization complete"  
3. You should see Alice and Bob chat windows side-by-side
4. Click the **💬 Chat Interface** button (should be active)

### Step 2: Send a Test Message
1. In Alice's chat window (left side)
2. Type a message: "Testing flow visualization"
3. Press Enter or click Send
4. **Check browser console** (F12 → Console tab)
5. Look for these logs:
   ```
   [FLOW] Capturing message for flow visualization: <message-id>
   [FLOW] Message captured successfully!
   New message flow captured: {...}
   ```

### Step 3: View the Flow
1. Click the **🔄 Flow Visualization** button in the header
2. You should now see the flow with your actual message!
3. If you still see "No Message Sent Yet", check the console for errors

### Troubleshooting:

**If you see errors in console:**
- Screenshot the error and share it
- Check if Key Service port-forward is still running

**If no console logs appear:**
- The message might not be sending
- Check if Alice/Bob are connected (green checkmark in chat header)

**Quick Fix - Use Mock Data:**
If real-time isn't working, I can switch back to the demo with predefined data that always works.

**Let me know:**
1. Do you see the console logs when you send a message?
2. Any errors in the browser console?
3. Are Alice and Bob showing as "Connected"?
