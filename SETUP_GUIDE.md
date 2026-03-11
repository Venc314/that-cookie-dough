# That Cookie Dough - Order Registration System Setup Guide

This guide provides step-by-step instructions to integrate the Google Apps Script backend with your existing "That Cookie Dough" website for order registration.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Create Google Spreadsheet](#1-create-google-spreadsheet)
3. [Open Google Apps Script](#2-open-google-apps-script)
4. [Paste Backend Code](#3-paste-backend-code)
5. [Deploy as Web App](#4-deploy-as-web-app)
6. [Get Web App URL](#5-get-web-app-url)
7. [Integrate with Frontend](#6-integrate-with-frontend)
8. [Test the System](#7-test-the-system)
9. [Example Data](#example-data)
10. [Troubleshooting](#troubleshooting)

---

## System Overview

The system consists of three parts:

1. **Frontend (orderService.js)** - JavaScript service that sends order data to the backend
2. **Backend (Code.gs)** - Google Apps Script that receives and stores orders
3. **Storage (Google Spreadsheet)** - Where orders are saved

### Data Flow

```
User clicks "Place Order"
         ↓
orderService.js validates & sends data
         ↓
Google Apps Script receives POST request
         ↓
Data saved to Google Spreadsheet
         ↓
Success response sent back to frontend
         ↓
User sees confirmation message
```

---

## Step 1: Create Google Spreadsheet

1. Go to [sheets.google.com](https://sheets.google.com)
2. Click **+ New** to create a new spreadsheet
3. Name the spreadsheet: `That Cookie Dough Orders`
4. Rename the default sheet (tab) to: `Orders`

> **Important:** The sheet must be named "Orders" (case-sensitive) or the script will create it automatically.

---

## Step 2: Open Google Apps Script

1. In your Google Spreadsheet, go to **Extensions** menu
2. Click on **Apps Script**
3. This opens the Google Apps Script editor in a new tab

---

## Step 3: Paste Backend Code

1. In the Apps Script editor, you should see a file named `Code.gs`
2. If not, click the **+** icon next to "Files" and select **Script**
3. Rename the file to `Code.gs`
4. Open the `Code.gs` file we created
5. Copy all the code from `Code.gs`
6. Paste it into the editor, replacing any existing code
7. Click the **Save** icon (or press Ctrl+S)

---

## Step 4: Deploy as Web App

1. Click the **Deploy** button (blue button) in the top right corner
2. Select **New deployment**
3. Click the **Select type** gear icon and choose **Web app**
4. Configure the deployment:
   - **Description**: "That Cookie Dough Order API v1"
   - **Execute as**: Select **Me** (your Google account)
   - **Who has access**: Select **Anyone** (this is required for public access)
5. Click **Deploy**
6. You may be asked to authorize the script:
   - Click **Review Permissions**
   - Select your Google account
   - Click **Advanced** → **Go to (unsafe)** (it's safe, this is your own script)
   - Click **Allow**

---

## Step 5: Get Web App URL

1. After deployment, you'll see a deployment window
2. **Copy the Web App URL** - it looks like:
   ```
   https://script.google.com/macros/s/XXXXXXXXXXXXXXX/exec
   ```
3. Click **Done** to close the window

> **Important:** Save this URL somewhere safe. You'll need it for the frontend integration.

---

## Step 6: Integrate with Frontend

### Option A: Using the orderService.js (Recommended)

We've already created the `orderService.js` file for you. You need to:

1. **Include the script** in your HTML files:

   Add this line before the closing `</body>` tag in both `product.html` and `productinfo.html`:

   ```html
   <script src="src/scripts/orderService.js"></script>
   ```

2. **Configure the service** with your Web App URL:

   Add this code before your existing form submission code:

   ```javascript
   // Configure OrderService with your Google Apps Script Web App URL
   OrderService.configure("YOUR_WEB_APP_URL_HERE");
   ```

   Replace `YOUR_WEB_APP_URL_HERE` with the URL you copied in Step 5.

3. **Modify the form submission** to use the service:

   Find the existing form submission code and modify it to call the service.

#### For productinfo.html:

Replace the form submission code (around line 934-955) with:

```javascript
/* Form */
document.getElementById("order-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const name = document.getElementById("customer-name").value.trim();
  const address = document.getElementById("customer-address").value.trim();
  const contact = document.getElementById("customer-contact").value.trim();
  if (!name || !address || !contact) {
    alert("Please fill in all fields before placing your order.");
    return;
  }

  const placeBtn = document.getElementById("btn-place-order");
  placeBtn.classList.add("loading");

  // Send order to Google Sheets via OrderService
  OrderService.sendOrderFromCart(cart, {
    customerName: name,
    phoneNumber: contact,
    address: address,
  })
    .then((response) => {
      // Order successful - existing UI logic
      placeBtn.classList.remove("loading");
      closeOrderModal();
      cart = [];
      renderCart();
      e.target.reset();
      const toast = document.getElementById("order-toast");
      toast.classList.add("show");
      setTimeout(() => toast.classList.remove("show"), 4500);
      console.log("Order saved:", response);
    })
    .catch((error) => {
      // Handle error
      placeBtn.classList.remove("loading");
      alert("Failed to place order: " + error.message);
    });
});
```

#### For product.html:

Replace the form submission code (around line 1036-1052) with:

```javascript
/* Order form submit */
document.getElementById("order-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const name = document.getElementById("customer-name").value.trim();
  const address = document.getElementById("customer-address").value.trim();
  const contact = document.getElementById("customer-contact").value.trim();
  if (!name || !address || !contact) {
    alert("Please fill in all fields before placing your order.");
    return;
  }

  // Send order to Google Sheets via OrderService
  OrderService.sendOrderFromCart(cart, {
    customerName: name,
    phoneNumber: contact,
    address: address,
  })
    .then((response) => {
      // Order successful - existing UI logic
      closeOrderModal();
      cart = [];
      renderCart();
      e.target.reset();
      const toast = document.getElementById("order-toast");
      toast.classList.add("show");
      setTimeout(() => toast.classList.remove("show"), 4500);
      console.log("Order saved:", response);
    })
    .catch((error) => {
      // Handle error
      alert("Failed to place order: " + error.message);
    });
});
```

---

## Step 7: Test the System

### Test 1: Verify Backend

1. Go to your Google Apps Script editor
2. Click the **Run** button (play icon)
3. Select **testOrderSubmission**
4. Click **Run** again
5. Check your Google Spreadsheet - you should see a test order

### Test 2: Test Frontend

1. Open your website (product.html or productinfo.html)
2. Add items to cart
3. Click "Order Now" or open cart
4. Fill in the order form:
   - Name: Test Customer
   - Address: 123 Test Street, City
   - Contact: 09123456789
5. Click "Place Order"
6. Check your Google Spreadsheet - the new order should appear

---

## Example Data

### Example Request Payload

When the frontend sends an order, the data looks like this:

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "customerName": "Maria Santos",
  "phoneNumber": "09123456789",
  "address": "123 Main Street, Barangay 5, Quezon City",
  "product": "Chocolate Chip Cookie x2 (₱100), Oatmeal Cookie x1 (₱45)",
  "quantity": 3,
  "price": 145,
  "total": 145,
  "status": "Pending"
}
```

### Example Spreadsheet Result

| Timestamp           | CustomerName | PhoneNumber | Product                                                  | Quantity | Price | Total | Address                                  | Status  |
| ------------------- | ------------ | ----------- | -------------------------------------------------------- | -------- | ----- | ----- | ---------------------------------------- | ------- |
| 2024-01-15 10:30:00 | Maria Santos | 09123456789 | Chocolate Chip Cookie x2 (₱100), Oatmeal Cookie x1 (₱45) | 3        | 145   | 145   | 123 Main Street, Barangay 5, Quezon City | Pending |
| 2024-01-15 09:15:00 | John Doe     | 09876543210 | Classic Cookie x5 (₱250)                                 | 5        | 250   | 250   | 456 Oak Avenue, Makati                   | Pending |

---

## Troubleshooting

### Common Errors and Fixes

#### Error: "OrderService is not configured"

**Cause:** The Web App URL is not set in the frontend.

**Fix:** Make sure you added this line before using the service:

```javascript
OrderService.configure("YOUR_WEB_APP_URL");
```

#### Error: "Network error. Please check your internet connection"

**Cause:** Cannot reach the Google Apps Script endpoint.

**Fix:**

1. Verify the Web App URL is correct
2. Make sure the script is deployed with "Anyone" access
3. Try redeploying the script

#### Error: "Server responded with status: 401" or "403"

**Cause:** Authorization issue.

**Fix:**

1. Go to Google Apps Script editor
2. Deploy → Manage deployments
3. Check that "Execute as" is set to "Me"
4. Check that "Who has access" is set to "Anyone"

#### Error: "Validation failed: Customer name is required"

**Cause:** Form validation in the frontend.

**Fix:** Ensure all form fields are filled before submitting.

#### Error: "Failed to process order" in spreadsheet

**Cause:** The script encountered an error.

**Fix:**

1. In Apps Script editor, click **View** → **Logs**
2. Check for error messages
3. Verify the spreadsheet exists and is accessible

### Tips for Success

1. **Always test locally first** - Use the test function in Apps Script
2. **Check the logs** - Apps Script has built-in logging (View → Logs)
3. **Keep the URL safe** - Don't share your deployment URL publicly
4. **Redeploy after changes** - Any code changes require a new deployment

---

## Security Considerations

- The "Anyone" access is required for a public website
- Only you can see the data in your Google Spreadsheet
- No sensitive data (passwords, API keys) is stored
- Consider setting up email notifications for new orders

---

## Support

If you encounter issues not covered in this guide:

1. Check Google Apps Script logs (View → Logs)
2. Check browser console (F12 → Console)
3. Verify all steps were followed correctly
4. Try redeploying the web app

---

## Files Included

- **src/scripts/orderService.js** - Frontend order service
- **Code.gs** - Google Apps Script backend
- **SETUP_GUIDE.md** - This documentation

---

**End of Setup Guide**
