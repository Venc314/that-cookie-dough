/**
 * Google Apps Script - Order Registration Backend (PRODUCTION-READY)
 *
 * This script handles order submissions from the mobile app frontend.
 * It is designed to be ultra-robust with proper validation, locking,
 * error handling, and data sanitization.
 *
 * FEATURES:
 * - Order submission with POST requests
 * - Unique Order ID generation (ORD-YYMMDD-XXXX)
 * - Monthly Order Analytics tracking
 * - Data storage in "Orders" sheet
 * - Status color application
 * - Error logging and success logging
 * - PH-local timestamps (UTC+8)
 * - Formula injection prevention
 * - Locking for concurrent writes
 *
 * SPREADSHEET COLUMNS (in order):
 * 1. Timestamp  - Date/time when order was placed
 * 2. OrderID    - Unique order identifier (ORD-YYMMDD-XXXX)
 * 3. CustomerName - Customer's full name
 * 4. PhoneNumber - Customer's Philippine mobile number (09XXXXXXXXX)
 * 5. Product    - List of products ordered
 * 6. Quantity   - Total number of items
 * 7. Price      - Price per item
 * 8. Total      - Total order amount
 * 9. Address    - Delivery address
 * 10. Status    - Order status (Pending/Processing/Delivered/Cancelled)
 * 11. Notes     - Additional instructions/remarks
 *
 * MONTHLY ANALYTICS COLUMNS:
 * 1. Year       - Year (YYYY)
 * 2. Month      - Month (1-12)
 * 3. TotalOrders - Total number of orders
 * 4. TotalQuantity - Total items sold
 * 5. TotalRevenue - Total revenue (PHP)
 * 6. Pending    - Orders with Pending status
 * 7. Processing - Orders with Processing status
 * 8. Delivered  - Orders with Delivered status
 * 9. Cancelled  - Orders with Cancelled status
 *
 * @version 3.0.0
 * @author That Cookie Dough
 *
 * DEPLOYMENT INSTRUCTIONS:
 * 1. Open Google Apps Script (script.google.com)
 * 2. Create a new project or open existing
 * 3. Paste this code into Code.gs
 * 4. Save the project
 * 5. Deploy as Web App:
 *    - Execute as: Me
 *    - Access: Anyone
 *    - Description: "Order API v3.0 with Analytics"
 * 6. Copy the Web App URL
 * 7. Use in frontend orderService.js configuration
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

// Spreadsheet configuration
var SPREADSHEET_ID = ""; // Leave empty to use the active spreadsheet
var SHEET_NAME = "Orders"; // Name of the sheet where orders will be stored

// Analytics sheet configuration
var ANALYTICS_SHEET_NAME = "MonthlyAnalytics";

// Column headers for Orders sheet (must match spreadsheet columns - DO NOT CHANGE ORDER)
var COLUMNS = [
  "Timestamp",
  "OrderID",
  "CustomerName",
  "PhoneNumber",
  "Product",
  "Quantity",
  "Price",
  "Total",
  "Address",
  "Status",
  "Notes",
];

// Column headers for Monthly Analytics sheet
var ANALYTICS_COLUMNS = [
  "Year",
  "Month",
  "TotalOrders",
  "TotalQuantity",
  "TotalRevenue",
  "Pending",
  "Processing",
  "Delivered",
  "Cancelled",
];

// Status color mapping (Status -> RGB color)
var STATUS_COLORS = {
  Pending: "#FFFACD", // Yellow/LemonChiffon
  Processing: "#ADD8E6", // LightBlue
  Delivered: "#90EE90", // LightGreen
  Cancelled: "#FFB6C1", // LightPink/Red
};

// Valid status values
var VALID_STATUSES = ["Pending", "Processing", "Delivered", "Cancelled"];

// Error log configuration
var ERROR_LOG_SHEET = "ErrorLog";
var MAX_ERROR_LOG_ROWS = 100;

// ============================================================================
// TIMESTAMP HELPER - Philippine Local Time (UTC+8)
// ============================================================================

/**
 * Get current timestamp in Philippine local time (UTC+8).
 * Returns formatted string: YYYY-MM-DD HH:MM:SS
 *
 * @returns {string} Formatted Philippine local timestamp
 */
function getPHLocalTimestamp() {
  // Use Utilities.formatDate to ensure consistent Timezone format strictly as YYYY-MM-DD HH:MM:SS
  var now = new Date();
  return Utilities.formatDate(now, "Asia/Manila", "yyyy-MM-dd HH:mm:ss");
}

/**
 * Parse PH local timestamp string to Date object.
 * Expected format: YYYY-MM-DD HH:MM:SS
 *
 * @param {string} timestampStr - The timestamp string
 * @returns {Date} Date object in PH local time
 */
function parsePHLocalTimestamp(timestampStr) {
  if (!timestampStr || typeof timestampStr !== "string") {
    return null;
  }

  try {
    // Expected format: YYYY-MM-DD HH:MM:SS
    var parts = timestampStr.match(
      /(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/,
    );
    if (parts) {
      var year = parseInt(parts[1], 10);
      var month = parseInt(parts[2], 10) - 1; // Months are 0-based
      var day = parseInt(parts[3], 10);
      var hours = parseInt(parts[4], 10);
      var minutes = parseInt(parts[5], 10);
      var seconds = parseInt(parts[6], 10);

      // Create date in local time (PH is UTC+8)
      return new Date(year, month, day, hours, minutes, seconds);
    }
  } catch (e) {
    Logger.log("Error parsing timestamp: " + e.message);
  }
  return null;
}

/**
 * Extract Year and Month from timestamp string.
 *
 * @param {string} timestampStr - The timestamp string (YYYY-MM-DD format)
 * @returns {Object} Object with year and month
 */
function extractYearMonthFromTimestamp(timestampStr) {
  var date = parsePHLocalTimestamp(timestampStr);
  if (date) {
    return {
      year: date.getFullYear(),
      month: date.getMonth() + 1, // 1-12
    };
  }

  // Fallback: use current PH time
  var now = new Date();
  var utc = now.getTime() + now.getTimezoneOffset() * 60000;
  var phDate = new Date(utc + 3600000 * 8);

  return {
    year: phDate.getFullYear(),
    month: phDate.getMonth() + 1,
  };
}

// ============================================================================
// MAIN DOPOST FUNCTION - Handles POST requests from frontend
// ============================================================================

/**
 * Main function to handle POST requests from the frontend.
 * This is the entry point for all order submissions and status updates.
 *
 * @param {Object} e - The event object containing form data
 * @returns {TextOutput} JSON response to the client
 */
function doPost(e) {
  try {
    // Handle the case when e is undefined (when called from editor)
    if (!e || !e.parameter) {
      return ContentService.createTextOutput(
        JSON.stringify({
          success: false,
          message:
            "This endpoint requires a POST request. Use doGet() for testing.",
        }),
      ).setMimeType(ContentService.MimeType.JSON);
    }

    // Set CORS headers by returning JSON
    var output = ContentService.createTextOutput();
    output.setMimeType(ContentService.MimeType.JSON);

    // Parse the incoming action
    var action = e.parameter.action;

    if (action === "submitOrder") {
      // Process order submission
      var result = handleOrderSubmission(e);
      output.setContent(JSON.stringify(result));
    } else if (action === "updateStatus") {
      // Process status update
      var result = handleStatusUpdate(e);
      output.setContent(JSON.stringify(result));
    } else if (action === "getAnalytics") {
      // Get monthly analytics
      var result = getMonthlyAnalytics();
      output.setContent(JSON.stringify(result));
    } else if (action === "getOrders") {
      // Get all orders (for admin/filtering)
      var result = getOrders();
      output.setContent(JSON.stringify(result));
    } else {
      // Unknown action
      output.setContent(
        JSON.stringify({
          success: false,
          message: "Unknown action: " + action,
        }),
      );
    }

    return output;
  } catch (error) {
    // Log the error
    logError("doPost", error);

    // Return error response
    return ContentService.createTextOutput(
      JSON.stringify({
        success: false,
        message: "Server error: " + error.message,
      }),
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

// ============================================================================
// ORDER HANDLING
// ============================================================================

/**
 * Handle order submission from frontend.
 * This function validates, sanitizes, and stores the order data.
 * Uses LockService to prevent concurrent write conflicts.
 *
 * @param {Object} e - The event object containing form data
 * @returns {Object} Result object with success status, orderId, and message
 */
function handleOrderSubmission(e) {
  var lock = null;

  try {
    // Acquire lock to prevent concurrent writes
    // Wait up to 10 seconds for lock, then throw error
    lock = LockService.getScriptLock();
    lock.waitLock(10000);

    // Parse the JSON data from the form parameter
    var dataString = e.parameter.data;

    if (!dataString || dataString.trim() === "") {
      return {
        success: false,
        message: "No data provided",
      };
    }

    var orderData = JSON.parse(dataString);

    // Validate all required fields
    var validationError = validateOrderData(orderData);
    if (validationError) {
      return {
        success: false,
        message: validationError,
      };
    }

    // Sanitize inputs to prevent formula injection
    orderData = sanitizeOrderData(orderData);

    // Get or create the spreadsheet
    var sheet = getOrCreateSheet();

    // Generate unique order ID
    var orderId = generateOrderId(sheet);

    // Prepare row data with the new columns
    var rowData = prepareRowData(orderData, orderId);

    // Append the row to the spreadsheet
    var lastRow = sheet.getLastRow();
    var newRow = lastRow + 1;
    sheet.getRange(newRow, 1, 1, rowData.length).setValues([rowData]);

    // Apply status color to the new row
    applyStatusColor(sheet, newRow, "Pending");

    // Update monthly analytics (for the new order)
    updateMonthlyAnalytics();

    // Log success
    logSuccess("Order submitted", orderId + " - " + orderData.customerName);

    // Return success response with order ID
    return {
      success: true,
      orderId: orderId,
      message: "Order placed successfully!",
      timestamp: getPHLocalTimestamp(),
    };
  } catch (error) {
    logError("handleOrderSubmission", error);
    return {
      success: false,
      message: "Failed to process order: " + error.message,
    };
  } finally {
    // Always release the lock
    if (lock) {
      lock.releaseLock();
    }
  }
}

/**
 * Handle status update from frontend.
 *
 * @param {Object} e - The event object containing form data
 * @returns {Object} Result object with success status and message
 */
function handleStatusUpdate(e) {
  var lock = null;

  try {
    lock = LockService.getScriptLock();
    lock.waitLock(10000);

    var dataString = e.parameter.data;

    if (!dataString || dataString.trim() === "") {
      return {
        success: false,
        message: "No data provided",
      };
    }

    var updateData = JSON.parse(dataString);

    // Validate required fields
    if (!updateData.orderId) {
      return {
        success: false,
        message: "Order ID is required",
      };
    }

    if (!updateData.status || !VALID_STATUSES.includes(updateData.status)) {
      return {
        success: false,
        message:
          "Valid status is required (Pending, Processing, Delivered, Cancelled)",
      };
    }

    // Update the order status
    var result = updateOrderStatus(updateData.orderId, updateData.status);

    // Update monthly analytics after status change
    if (result.success) {
      updateMonthlyAnalytics();
    }

    return result;
  } catch (error) {
    logError("handleStatusUpdate", error);
    return {
      success: false,
      message: "Failed to update status: " + error.message,
    };
  } finally {
    if (lock) {
      lock.releaseLock();
    }
  }
}

/**
 * Validate order data before saving.
 * Checks all required fields and validates formats.
 *
 * @param {Object} data - The order data to validate
 * @returns {string|null} Error message or null if valid
 */
function validateOrderData(data) {
  // Check required fields exist
  if (!data) {
    return "No order data provided";
  }

  // Validate CustomerName: must be at least 2 characters
  if (!data.customerName || typeof data.customerName !== "string") {
    return "Customer name is required";
  }
  if (data.customerName.trim().length < 2) {
    return "Customer name must be at least 2 characters";
  }

  // Validate PhoneNumber: Philippine pattern (09XXXXXXXXX)
  if (!data.phoneNumber || typeof data.phoneNumber !== "string") {
    return "Phone number is required";
  }
  // Remove spaces and dashes for validation
  var cleanPhone = data.phoneNumber.replace(/[\s\-]/g, "");
  // Philippine mobile: 11 digits starting with 09
  if (!/^09\d{9}$/.test(cleanPhone)) {
    return "Invalid phone number. Use Philippine format: 09XXXXXXXXX";
  }

  // Validate Address: must be at least 5 characters
  if (!data.address || typeof data.address !== "string") {
    return "Delivery address is required";
  }
  if (data.address.trim().length < 5) {
    return "Address must be at least 5 characters";
  }

  // Validate Product: not empty
  if (!data.product || typeof data.product !== "string") {
    return "Product is required";
  }
  if (data.product.trim().length === 0) {
    return "No products specified";
  }

  // Validate Quantity: must be greater than 0
  var quantity = parseInt(data.quantity, 10);
  if (isNaN(quantity) || quantity <= 0) {
    return "Quantity must be greater than 0";
  }

  // Validate Price: must be a positive number
  var price = parseFloat(data.price);
  if (isNaN(price) || price < 0) {
    return "Valid price is required";
  }

  // Validate Total: must be greater than 0
  var total = parseFloat(data.total);
  if (isNaN(total) || total <= 0) {
    return "Valid total amount is required";
  }

  // CRITICAL: Validate that Total = Quantity × Price
  var expectedTotal = quantity * price;
  if (Math.abs(expectedTotal - total) > 0.01) {
    // Allow small floating point difference
    return (
      "Total mismatch. Expected: " + expectedTotal + ", Received: " + total
    );
  }

  // Validate Status: must be one of the allowed values
  if (data.status && !VALID_STATUSES.includes(data.status)) {
    return "Invalid status value";
  }

  return null; // Valid
}

/**
 * Sanitize order data to prevent formula injection attacks.
 * Prevents cells from being interpreted as formulas (=, +, -, @, etc.)
 *
 * @param {Object} data - The order data to sanitize
 * @returns {Object} Sanitized order data
 */
function sanitizeOrderData(data) {
  // List of dangerous characters that can trigger formula injection
  var dangerousChars = ["=", "+", "-", "@", "\t", "\r", "\n"];

  // Fields that need sanitization
  var fieldsToSanitize = [
    "customerName",
    "phoneNumber",
    "product",
    "address",
    "notes",
  ];

  fieldsToSanitize.forEach(function (field) {
    if (data[field] && typeof data[field] === "string") {
      var value = data[field];

      // Check if the value starts with a dangerous character
      var startsWithDangerous = dangerousChars.some(function (char) {
        return value.charAt(0) === char;
      });

      // If starts with dangerous char, prepend with apostrophe to escape it
      if (startsWithDangerous) {
        data[field] = "'" + value;
      }
    }
  });

  return data;
}

/**
 * Generate a unique order ID in format ORD-YYMMDD-XXXX
 * Where XXXX is an incremental number per day
 *
 * @param {Sheet} sheet - The orders sheet
 * @returns {string} Unique order ID
 */
function generateOrderId(sheet) {
  var now = new Date();
  var year = now.getFullYear().toString().substr(-2); // Last 2 digits
  var month = ("0" + (now.getMonth() + 1)).slice(-2); // 01-12
  var day = ("0" + now.getDate()).slice(-2); // 01-31

  var datePrefix = "ORD-" + year + month + day + "-";

  // Find the highest order number for today
  var lastRow = sheet.getLastRow();
  var maxNumber = 0;

  if (lastRow > 1) {
    // If there's data beyond headers
    // Get OrderID column (column 2)
    var orderIdRange = sheet.getRange(2, 2, lastRow - 1, 1);
    var orderIds = orderIdRange.getValues();

    orderIds.forEach(function (row) {
      var orderId = row[0];
      if (
        orderId &&
        typeof orderId === "string" &&
        orderId.startsWith(datePrefix)
      ) {
        var numPart = orderId.split("-")[2];
        var num = parseInt(numPart, 10);
        if (!isNaN(num) && num > maxNumber) {
          maxNumber = num;
        }
      }
    });
  }

  // Generate new order number (increment from max)
  var newNumber = maxNumber + 1;
  var orderId = datePrefix + ("000" + newNumber).slice(-4);

  return orderId;
}

/**
 * Prepare row data for spreadsheet insertion.
 * Maps order data to columns in the correct order.
 *
 * @param {Object} data - The order data
 * @param {string} orderId - The generated order ID
 * @returns {Array} Array of values for the spreadsheet row
 */
function prepareRowData(data, orderId) {
  return [
    data.timestamp || getPHLocalTimestamp(), // Timestamp
    orderId, // OrderID
    (data.customerName || "").trim(), // CustomerName
    (data.phoneNumber || "").trim(), // PhoneNumber
    (data.product || "").trim(), // Product
    parseInt(data.quantity, 10) || 1, // Quantity
    parseFloat(data.price) || 0, // Price
    parseFloat(data.total) || 0, // Total
    (data.address || "").trim(), // Address
    data.status || "Pending", // Status
    data.notes || "", // Notes/Remarks
  ];
}

/**
 * Apply background color to a row based on status.
 *
 * @param {Sheet} sheet - The sheet
 * @param {number} rowNumber - Row number to color
 * @param {string} status - Status value
 */
function applyStatusColor(sheet, rowNumber, status) {
  var color = STATUS_COLORS[status] || "#FFFFFF";
  var lastColumn = COLUMNS.length;
  sheet.getRange(rowNumber, 1, 1, lastColumn).setBackgroundColor(color);
}

// ============================================================================
// SPREADSHEET OPERATIONS
// ============================================================================

/**
 * Get or create the orders sheet with proper headers.
 * Creates headers ONLY if the sheet is new (no headers exist).
 * NEVER overwrites existing data.
 *
 * @returns {Sheet} The sheet object
 */
function getOrCreateSheet() {
  // Get the spreadsheet
  var spreadsheet = SPREADSHEET_ID
    ? SpreadsheetApp.openById(SPREADSHEET_ID)
    : SpreadsheetApp.getActiveSpreadsheet();

  var sheet;

  // Check if sheet exists
  try {
    sheet = spreadsheet.getSheetByName(SHEET_NAME);
  } catch (e) {
    sheet = null;
  }

  // Create new sheet if it doesn't exist
  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
    Logger.log("Created new sheet: " + SHEET_NAME);

    // Add headers to new sheet
    var headerRange = sheet.getRange(1, 1, 1, COLUMNS.length);
    headerRange.setValues([COLUMNS]);
    headerRange.setFontWeight("bold");

    // Format header row
    headerRange.setBackgroundRGB(210, 180, 140); // Tan/brown color
    headerRange.setFontColor("white");

    Logger.log("Headers created: " + COLUMNS.join(", "));
  } else {
    // Sheet exists - check if headers need to be created
    var lastRow = sheet.getLastRow();

    if (lastRow === 0) {
      // Empty sheet, add headers
      var headerRange = sheet.getRange(1, 1, 1, COLUMNS.length);
      headerRange.setValues([COLUMNS]);
      headerRange.setFontWeight("bold");
      headerRange.setBackgroundRGB(210, 180, 140);
      headerRange.setFontColor("white");
      Logger.log("Headers added to empty sheet");
    } else {
      // Check if first row contains our headers
      var firstRow = sheet.getRange(1, 1, 1, COLUMNS.length).getValues()[0];
      var hasHeaders = firstRow.length > 0 && firstRow[0] === "Timestamp";

      if (!hasHeaders) {
        // Insert header row at position 1
        sheet.insertRowBefore(1);
        var headerRange = sheet.getRange(1, 1, 1, COLUMNS.length);
        headerRange.setValues([COLUMNS]);
        headerRange.setFontWeight("bold");
        headerRange.setBackgroundRGB(210, 180, 140);
        headerRange.setFontColor("white");
        Logger.log("Headers inserted at row 1");
      }
    }
  }

  // Auto-resize columns to fit content
  try {
    sheet.autoResizeColumns(1, COLUMNS.length);
  } catch (e) {
    // Ignore auto-resize errors
  }

  return sheet;
}

/**
 * Get all orders from the spreadsheet.
 *
 * @returns {Array} Array of order objects
 */
function getOrders() {
  var sheet = getOrCreateSheet();
  var lastRow = sheet.getLastRow();

  if (lastRow <= 1) {
    return []; // No data, just headers
  }

  var dataRange = sheet.getRange(2, 1, lastRow - 1, COLUMNS.length);
  var data = dataRange.getValues();

  var orders = [];
  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    var order = {};

    for (var j = 0; j < COLUMNS.length; j++) {
      order[COLUMNS[j]] = row[j];
    }

    orders.push(order);
  }

  return orders;
}

/**
 * Update order status by OrderID.
 *
 * @param {string} orderId - The order ID
 * @param {string} newStatus - New status (Pending/Processing/Delivered/Cancelled)
 * @returns {Object} Result object
 */
function updateOrderStatus(orderId, newStatus) {
  var lock = null;

  try {
    lock = LockService.getScriptLock();
    lock.waitLock(10000);

    var sheet = getOrCreateSheet();
    var lastRow = sheet.getLastRow();

    // Find the order by OrderID (column 2)
    var found = false;
    for (var row = 2; row <= lastRow; row++) {
      var currentOrderId = sheet.getRange(row, 2).getValue();

      if (currentOrderId === orderId) {
        // Update status (column 10)
        sheet.getRange(row, 10).setValue(newStatus);

        // Apply color
        applyStatusColor(sheet, row, newStatus);

        found = true;
        Logger.log("Updated order " + orderId + " status to " + newStatus);
        break;
      }
    }

    if (!found) {
      return {
        success: false,
        message: "Order not found: " + orderId,
      };
    }

    return {
      success: true,
      message: "Order status updated",
    };
  } catch (error) {
    logError("updateOrderStatus", error);
    return {
      success: false,
      message: "Failed to update status: " + error.message,
    };
  } finally {
    if (lock) {
      lock.releaseLock();
    }
  }
}

// ============================================================================
// MONTHLY ANALYTICS - Core Functions
// ============================================================================

/**
 * Get or create the MonthlyAnalytics sheet with proper headers.
 * Creates headers ONLY if the sheet is new.
 * NEVER overwrites existing data.
 *
 * @returns {Sheet} The analytics sheet object
 */
function getOrCreateAnalyticsSheet() {
  // Get the spreadsheet
  var spreadsheet = SPREADSHEET_ID
    ? SpreadsheetApp.openById(SPREADSHEET_ID)
    : SpreadsheetApp.getActiveSpreadsheet();

  var sheet;

  // Check if sheet exists
  try {
    sheet = spreadsheet.getSheetByName(ANALYTICS_SHEET_NAME);
  } catch (e) {
    sheet = null;
  }

  // Create new sheet if it doesn't exist
  if (!sheet) {
    // Insert after Orders sheet or at the end
    var ordersSheet = spreadsheet.getSheetByName(SHEET_NAME);
    if (ordersSheet) {
      sheet = spreadsheet.insertSheet(
        ANALYTICS_SHEET_NAME,
        spreadsheet.getNumSheets(),
      );
    } else {
      sheet = spreadsheet.insertSheet(ANALYTICS_SHEET_NAME);
    }
    Logger.log("Created new analytics sheet: " + ANALYTICS_SHEET_NAME);

    // Add headers to new sheet
    var headerRange = sheet.getRange(1, 1, 1, ANALYTICS_COLUMNS.length);
    headerRange.setValues([ANALYTICS_COLUMNS]);
    headerRange.setFontWeight("bold");

    // Format header row
    headerRange.setBackgroundRGB(70, 130, 180); // Steel blue color
    headerRange.setFontColor("white");

    Logger.log("Analytics headers created: " + ANALYTICS_COLUMNS.join(", "));
  } else {
    // Sheet exists - check if headers need to be created
    var lastRow = sheet.getLastRow();

    if (lastRow === 0) {
      // Empty sheet, add headers
      var headerRange = sheet.getRange(1, 1, 1, ANALYTICS_COLUMNS.length);
      headerRange.setValues([ANALYTICS_COLUMNS]);
      headerRange.setFontWeight("bold");
      headerRange.setBackgroundRGB(70, 130, 180);
      headerRange.setFontColor("white");
      Logger.log("Analytics headers added to empty sheet");
    } else {
      // Check if first row contains our headers
      var firstRow = sheet
        .getRange(1, 1, 1, ANALYTICS_COLUMNS.length)
        .getValues()[0];
      var hasHeaders = firstRow.length > 0 && firstRow[0] === "Year";

      if (!hasHeaders) {
        // Insert header row at position 1
        sheet.insertRowBefore(1);
        var headerRange = sheet.getRange(1, 1, 1, ANALYTICS_COLUMNS.length);
        headerRange.setValues([ANALYTICS_COLUMNS]);
        headerRange.setFontWeight("bold");
        headerRange.setBackgroundRGB(70, 130, 180);
        headerRange.setFontColor("white");
        Logger.log("Analytics headers inserted at row 1");
      }
    }
  }

  // Auto-resize columns to fit content
  try {
    sheet.autoResizeColumns(1, ANALYTICS_COLUMNS.length);
  } catch (e) {
    // Ignore auto-resize errors
  }

  return sheet;
}

/**
 * Recalculate analytics for all months from the Orders sheet.
 * This rebuilds the entire analytics sheet based on current order data.
 * Should be called periodically or when needed to sync analytics.
 *
 * @returns {Object} Result with success status and message
 */
function recalculateAnalyticsForAllMonths() {
  var lock = null;

  try {
    lock = LockService.getScriptLock();
    lock.waitLock(15000); // Longer wait for analytics recalculation

    // Get all orders
    var orders = getOrders();

    if (orders.length === 0) {
      return {
        success: true,
        message: "No orders to analyze",
        data: [],
      };
    }

    // Group orders by Year-Month
    var monthlyData = {};

    for (var i = 0; i < orders.length; i++) {
      var order = orders[i];

      // Extract year and month from timestamp
      var ym = extractYearMonthFromTimestamp(order.Timestamp);
      var key = ym.year + "-" + ym.month;

      if (!monthlyData[key]) {
        monthlyData[key] = {
          year: ym.year,
          month: ym.month,
          totalOrders: 0,
          totalQuantity: 0,
          totalRevenue: 0,
          pending: 0,
          processing: 0,
          delivered: 0,
          cancelled: 0,
        };
      }

      // Aggregate data
      monthlyData[key].totalOrders++;
      monthlyData[key].totalQuantity += parseInt(order.Quantity, 10) || 0;
      monthlyData[key].totalRevenue += parseFloat(order.Total) || 0;

      // Count by status
      var status = order.Status || "Pending";
      if (status === "Pending") {
        monthlyData[key].pending++;
      } else if (status === "Processing") {
        monthlyData[key].processing++;
      } else if (status === "Delivered") {
        monthlyData[key].delivered++;
      } else if (status === "Cancelled") {
        monthlyData[key].cancelled++;
      }
    }

    // Get analytics sheet
    var analyticsSheet = getOrCreateAnalyticsSheet();

    // Clear existing data (keep headers)
    var lastRow = analyticsSheet.getLastRow();
    if (lastRow > 1) {
      analyticsSheet.deleteRows(2, lastRow - 1);
    }

    // Convert monthly data to array and sort by Year, then Month
    var sortedData = [];
    for (var key in monthlyData) {
      sortedData.push(monthlyData[key]);
    }

    sortedData.sort(function (a, b) {
      if (a.year !== b.year) {
        return a.year - b.year;
      }
      return a.month - b.month;
    });

    // Prepare rows for insertion
    var rowsToInsert = [];
    for (var j = 0; j < sortedData.length; j++) {
      var md = sortedData[j];
      rowsToInsert.push([
        md.year,
        md.month,
        md.totalOrders,
        md.totalQuantity,
        Number(md.totalRevenue.toFixed(2)),
        md.pending,
        md.processing,
        md.delivered,
        md.cancelled,
      ]);
    }

    // Insert all rows at once for efficiency
    if (rowsToInsert.length > 0) {
      analyticsSheet
        .getRange(2, 1, rowsToInsert.length, ANALYTICS_COLUMNS.length)
        .setValues(rowsToInsert);
    }

    Logger.log(
      "Analytics recalculated: " + sortedData.length + " months updated",
    );

    return {
      success: true,
      message: "Analytics updated successfully",
      monthsCount: sortedData.length,
    };
  } catch (error) {
    logError("recalculateAnalyticsForAllMonths", error);
    return {
      success: false,
      message: "Failed to recalculate analytics: " + error.message,
    };
  } finally {
    if (lock) {
      lock.releaseLock();
    }
  }
}

/**
 * Update monthly analytics.
 * This is a wrapper that calls recalculateAnalyticsForAllMonths.
 * Should be called after order submission or status updates.
 *
 * @returns {Object} Result with success status
 */
function updateMonthlyAnalytics() {
  try {
    var result = recalculateAnalyticsForAllMonths();
    if (result.success) {
      logSuccess(
        "updateMonthlyAnalytics",
        "Analytics updated - " + result.monthsCount + " months",
      );
    }
    return result;
  } catch (error) {
    logError("updateMonthlyAnalytics", error);
    // Don't fail the main operation if analytics fails
    return {
      success: false,
      message: "Analytics update failed: " + error.message,
    };
  }
}

/**
 * Get monthly analytics data for API response.
 *
 * @returns {Object} Analytics data with success status
 */
function getMonthlyAnalytics() {
  try {
    var analyticsSheet = getOrCreateAnalyticsSheet();
    var lastRow = analyticsSheet.getLastRow();

    if (lastRow <= 1) {
      return {
        success: true,
        data: [],
        message: "No analytics data available",
      };
    }

    var dataRange = analyticsSheet.getRange(
      2,
      1,
      lastRow - 1,
      ANALYTICS_COLUMNS.length,
    );
    var data = dataRange.getValues();

    var analytics = [];
    for (var i = 0; i < data.length; i++) {
      var row = data[i];
      var monthData = {};

      for (var j = 0; j < ANALYTICS_COLUMNS.length; j++) {
        monthData[ANALYTICS_COLUMNS[j]] = row[j];
      }

      // Add month name for better readability
      var monthNames = [
        "",
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
      ];
      monthData.MonthName = monthNames[monthData.Month] || "";

      analytics.push(monthData);
    }

    return {
      success: true,
      data: analytics,
      count: analytics.length,
    };
  } catch (error) {
    logError("getMonthlyAnalytics", error);
    return {
      success: false,
      message: "Failed to retrieve analytics: " + error.message,
      data: [],
    };
  }
}

/**
 * Initialize analytics sheet.
 * Call this once to set up the analytics sheet with initial data.
 * Can be called from the Apps Script editor.
 *
 * @returns {Object} Result with success status
 */
function initializeAnalytics() {
  try {
    // Ensure analytics sheet exists with headers
    getOrCreateAnalyticsSheet();

    // Recalculate all analytics
    var result = recalculateAnalyticsForAllMonths();

    Logger.log("Analytics initialization complete: " + JSON.stringify(result));

    return result;
  } catch (error) {
    logError("initializeAnalytics", error);
    return {
      success: false,
      message: "Failed to initialize analytics: " + error.message,
    };
  }
}

// ============================================================================
// ERROR LOGGING
// ============================================================================

/**
 * Log successful operations to Apps Script Logger.
 *
 * @param {string} functionName - Name of the function
 * @param {string} details - Details about the operation
 */
function logSuccess(functionName, details) {
  var timestamp = getPHLocalTimestamp();
  Logger.log("[" + timestamp + "] SUCCESS - " + functionName + ": " + details);
}

/**
 * Log errors to both Apps Script Logger and ErrorLog sheet.
 * Maintains max 100 rows in ErrorLog sheet.
 *
 * @param {string} functionName - Name of the function where error occurred
 * @param {Object} error - The error object
 */
function logError(functionName, error) {
  var timestamp = getPHLocalTimestamp();
  var errorMessage = error.message || error.toString();
  var stackTrace = error.stack || "No stack trace";

  // Log to Apps Script Logger
  Logger.log(
    "[" + timestamp + "] ERROR - " + functionName + ": " + errorMessage,
  );
  Logger.log("Stack: " + stackTrace);

  // Also log to spreadsheet ErrorLog sheet
  try {
    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    var logSheet = spreadsheet.getSheetByName(ERROR_LOG_SHEET);

    if (!logSheet) {
      logSheet = spreadsheet.insertSheet(ERROR_LOG_SHEET);
      logSheet.appendRow(["Timestamp", "Function", "Error", "Stack"]);
      logSheet.getRange(1, 1, 1, 4).setFontWeight("bold");
    }

    // Add the error log entry
    logSheet.appendRow([timestamp, functionName, errorMessage, stackTrace]);

    // Check if we exceed max rows and delete oldest entries
    var lastRow = logSheet.getLastRow();
    if (lastRow > MAX_ERROR_LOG_ROWS) {
      // Keep header row (row 1) and last 99 data rows
      var rowsToDelete = lastRow - MAX_ERROR_LOG_ROWS;
      logSheet.deleteRows(2, rowsToDelete);
      Logger.log("Cleaned up " + rowsToDelete + " old error log entries");
    }
  } catch (logError) {
    // Can't log to spreadsheet, just continue
    Logger.log("Could not write to ErrorLog sheet: " + logError.message);
  }
}

// ============================================================================
// GET REQUEST HANDLER
// ============================================================================

/**
 * Handle GET requests (for testing/health check).
 * Returns a simple response to confirm the script is working.
 *
 * @returns {TextOutput} JSON response
 */
function doGet() {
  return ContentService.createTextOutput(
    JSON.stringify({
      status: "active",
      message: "That Cookie Dough Order API v3.0 is running",
      version: "3.0.0",
      features: {
        orderSubmission: true,
        statusUpdate: true,
        monthlyAnalytics: true,
      },
      endpoints: {
        POST: {
          submitOrder: {
            action: "submitOrder",
            data: "JSON string of order data",
          },
          updateStatus: {
            action: "updateStatus",
            data: "JSON with orderId and status",
          },
          getAnalytics: {
            action: "getAnalytics",
          },
          getOrders: {
            action: "getOrders",
          },
        },
      },
      orderColumns: COLUMNS,
      analyticsColumns: ANALYTICS_COLUMNS,
    }),
  ).setMimeType(ContentService.MimeType.JSON);
}

// ============================================================================
// TEST FUNCTIONS
// ============================================================================

/**
 * Test function to verify the script is working.
 * Call this from the Apps Script editor to test.
 *
 * @returns {Object} Test result
 */
function testOrderSubmission() {
  var testData = {
    timestamp: getPHLocalTimestamp(),
    customerName: "Test Customer",
    phoneNumber: "09123456789",
    product: "Chocolate Chip Cookie x2 (₱100)",
    quantity: 2,
    price: 50,
    total: 100,
    address: "123 Test Street, Test City",
    status: "Pending",
    notes: "Please deliver before 5 PM",
  };

  var mockEvent = {
    parameter: {
      action: "submitOrder",
      data: JSON.stringify(testData),
    },
  };

  var result = handleOrderSubmission(mockEvent);
  Logger.log("Test result: " + JSON.stringify(result));

  return result;
}

/**
 * Test validation functions.
 *
 * @returns {Object} Test results
 */
function testValidation() {
  var tests = [
    {
      name: "Valid order",
      data: {
        customerName: "John Doe",
        phoneNumber: "09123456789",
        product: "Cookie",
        quantity: 2,
        price: 50,
        total: 100,
        address: "123 Main Street",
      },
      expected: null,
    },
    {
      name: "Invalid name (too short)",
      data: {
        customerName: "J",
        phoneNumber: "09123456789",
        product: "Cookie",
        quantity: 2,
        price: 50,
        total: 100,
        address: "123 Main Street",
      },
      expected: "Customer name must be at least 2 characters",
    },
    {
      name: "Invalid phone (wrong format)",
      data: {
        customerName: "John",
        phoneNumber: "1234567890",
        product: "Cookie",
        quantity: 2,
        price: 50,
        total: 100,
        address: "123 Main Street",
      },
      expected: "Invalid phone number. Use Philippine format: 09XXXXXXXXX",
    },
    {
      name: "Total mismatch",
      data: {
        customerName: "John",
        phoneNumber: "09123456789",
        product: "Cookie",
        quantity: 2,
        price: 50,
        total: 99, // Should be 100
        address: "123 Main Street",
      },
      expected: "Total mismatch",
    },
  ];

  var results = [];

  tests.forEach(function (test) {
    var result = validateOrderData(test.data);
    var passed =
      (test.expected === null && result === null) ||
      (test.expected !== null && result && result.includes(test.expected));

    results.push({
      test: test.name,
      expected: test.expected,
      got: result,
      passed: passed,
    });

    Logger.log("Test: " + test.name + " - " + (passed ? "PASSED" : "FAILED"));
  });

  return results;
}

/**
 * Test sanitization functions.
 *
 * @returns {Object} Test results
 */
function testSanitization() {
  var tests = [
    {
      name: "Normal text",
      data: { product: "Chocolate Chip Cookie" },
      expected: "Chocolate Chip Cookie",
    },
    {
      name: "Formula injection attempt (=)",
      data: { product: "=1+1" },
      expected: "'=1+1", // Should be escaped with apostrophe
    },
    {
      name: "Formula injection attempt (+)",
      data: { product: "+SUM(A1:A10)" },
      expected: "'+SUM(A1:A10)",
    },
    {
      name: "Formula injection attempt (-)",
      data: { product: "-2+2" },
      expected: "'-2+2",
    },
    {
      name: "Formula injection attempt (@)",
      data: { product: "@CONCATENATE(A1,B1)" },
      expected: "'@CONCATENATE(A1,B1)",
    },
  ];

  var results = [];

  tests.forEach(function (test) {
    var sanitized = sanitizeOrderData(test.data);
    var passed = sanitized.product === test.expected;

    results.push({
      test: test.name,
      expected: test.expected,
      got: sanitized.product,
      passed: passed,
    });

    Logger.log("Test: " + test.name + " - " + (passed ? "PASSED" : "FAILED"));
  });

  return results;
}

/**
 * Test analytics functions.
 * Call this from the Apps Script editor to test analytics.
 *
 * @returns {Object} Test result
 */
function testAnalytics() {
  try {
    // Initialize analytics
    var initResult = initializeAnalytics();
    Logger.log("Init result: " + JSON.stringify(initResult));

    // Get analytics
    var analyticsResult = getMonthlyAnalytics();
    Logger.log("Analytics result: " + JSON.stringify(analyticsResult));

    return {
      success: true,
      initResult: initResult,
      analyticsResult: analyticsResult,
    };
  } catch (error) {
    Logger.log("Analytics test error: " + error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Force recalculate analytics manually.
 * Use this to rebuild analytics from scratch.
 *
 * @returns {Object} Result
 */
function forceRecalculateAnalytics() {
  return recalculateAnalyticsForAllMonths();
}

// ============================================================================
// ADDITIONAL IMPROVEMENTS & UTILITIES
// ============================================================================

/**
 * Get summary statistics for all time.
 * Useful for dashboard displays.
 *
 * @returns {Object} Summary statistics
 */
function getSummaryStats() {
  try {
    var orders = getOrders();

    var totalOrders = orders.length;
    var totalRevenue = 0;
    var totalQuantity = 0;
    var statusCounts = {
      Pending: 0,
      Processing: 0,
      Delivered: 0,
      Cancelled: 0,
    };

    for (var i = 0; i < orders.length; i++) {
      var order = orders[i];
      totalRevenue += parseFloat(order.Total) || 0;
      totalQuantity += parseInt(order.Quantity, 10) || 0;

      var status = order.Status || "Pending";
      if (statusCounts.hasOwnProperty(status)) {
        statusCounts[status]++;
      }
    }

    return {
      success: true,
      data: {
        totalOrders: totalOrders,
        totalRevenue: totalRevenue.toFixed(2),
        totalQuantity: totalQuantity,
        statusCounts: statusCounts,
      },
    };
  } catch (error) {
    logError("getSummaryStats", error);
    return {
      success: false,
      message: error.message,
    };
  }
}

/**
 * Get orders filtered by status.
 *
 * @param {string} status - Status to filter by
 * @returns {Array} Filtered orders
 */
function getOrdersByStatus(status) {
  if (!VALID_STATUSES.includes(status)) {
    return [];
  }

  var orders = getOrders();
  return orders.filter(function (order) {
    return order.Status === status;
  });
}

/**
 * Get orders filtered by date range.
 *
 * @param {string} startDate - Start date in DD-MM-YYYY format
 * @param {string} endDate - End date in DD-MM-YYYY format
 * @returns {Array} Filtered orders
 */
function getOrdersByDateRange(startDate, endDate) {
  var orders = getOrders();
  var start = parsePHLocalTimestamp(startDate + " 00:00:00");
  var end = parsePHLocalTimestamp(endDate + " 23:59:59");

  if (!start || !end) {
    return orders; // Return all if parsing fails
  }

  return orders.filter(function (order) {
    var orderDate = parsePHLocalTimestamp(order.Timestamp);
    return orderDate >= start && orderDate <= end;
  });
}
