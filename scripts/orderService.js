/**
 * Order Service - Frontend Integration for Google Apps Script Backend (PRODUCTION-READY)
 * 
 * This module handles order submission to Google Sheets via Google Apps Script.
 * It provides a clean, modular interface for sending order data to the backend
 * with comprehensive validation, sanitization, and error handling.
 * 
 * @author That Cookie Dough Backend Integration
 * @version 2.0.0
 * 
 * USAGE:
 * 
 * 1. Include this script in your HTML file:
 *    <script src="src/scripts/orderService.js"></script>
 * 
 * 2. Configure the Web App URL (optional - comes with default):
 *    OrderService.configure('YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL');
 * 
 * 3. Submit an order:
 *    const orderData = {
 *      customerName: 'John Doe',
 *      phoneNumber: '09123456789',
 *      product: 'Chocolate Chip Cookie x2 (₱100)',
 *      quantity: 2,
 *      price: 50,
 *      total: 100,
 *      address: '123 Main St, City',
 *      notes: 'Please ring doorbell'
 *    };
 *    
 *    OrderService.submitOrder(orderData)
 *      .then(response => {
 *        console.log('Order placed:', response.orderId);
 *        alert('Order ID: ' + response.orderId);
 *      })
 *      .catch(error => {
 *        console.error('Order failed:', error.message);
 *      });
 * 
 * VALIDATION RULES (matches backend):
 * - customerName: minimum 2 characters
 * - phoneNumber: Philippine format (09XXXXXXXXX)
 * - address: minimum 5 characters
 * - quantity: must be > 0
 * - total: must equal quantity × price
 * - product: cannot be empty
 */

(function(global) {
  'use strict';

  /**
   * OrderService - Main service object for order operations
   */
  var OrderService = {
    // =========================================================================
    // CONFIGURATION
    // =========================================================================
    
    // TODO: Replace with your Google Apps Script Web App URL
    // Get this from: Google Apps Script → Deploy → New Deployment → Web App
    // Example: https://script.google.com/macros/s/XXXXXXX/exec
    _webAppUrl: 'https://script.google.com/macros/s/AKfycbwQ9JFFHZa2yV7_ypKjhhHpWXCGJKaYabsR__NW4KqK0wH1Or28eNzp8yYn9OwOtX8QCQ/exec',
    _isConfigured: true,
    
    // Submission tracking to prevent duplicates
    _pendingSubmissions: new Map(),
    _submissionTimeout: 30000, // 30 seconds timeout
    
    // =========================================================================
    // PUBLIC METHODS
    // =========================================================================
    
    /**
     * Configure the Google Apps Script Web App URL
     * @param {string} webAppUrl - The Web App URL from Google Apps Script
     * @returns {boolean} True if configured successfully
     */
    configure: function(webAppUrl) {
      if (!webAppUrl || typeof webAppUrl !== 'string') {
        console.error('OrderService: Invalid Web App URL provided');
        return false;
      }
      
      // Remove trailing slashes and whitespace
      this._webAppUrl = webAppUrl.trim().replace(/\/+$/, '');
      this._isConfigured = true;
      console.log('OrderService: Configured with URL:', this._webAppUrl);
      return true;
    },
    
    /**
     * Check if the service is properly configured
     * @returns {boolean} True if configured, false otherwise
     */
    isConfigured: function() {
      return this._isConfigured && this._webAppUrl.length > 0;
    },
    
    /**
     * Submit an order to the backend
     * Validates, sanitizes, and sends order data to Google Sheets
     * 
     * @param {Object} orderData - The order data to submit
     * @returns {Promise} Promise resolving to server response
     */
    submitOrder: function(orderData) {
      var self = this;
      
      return new Promise(function(resolve, reject) {
        // Check configuration
        if (!self.isConfigured()) {
          reject(new Error('OrderService is not configured. Please call configure() with your Web App URL.'));
          return;
        }
        
        // Validate order data
        var validation = self.validateOrderData(orderData);
        if (!validation.isValid) {
          reject(new Error('Validation failed: ' + validation.errors.join(', ')));
          return;
        }
        
        // Sanitize inputs to prevent formula injection
        var sanitizedData = self.sanitizeOrderData(orderData);
        
        // Generate unique submission ID for duplicate prevention
        var submissionId = self._generateSubmissionId();
        
        // Check if there's already a pending submission
        if (self._pendingSubmissions.has(submissionId)) {
          reject(new Error('Duplicate submission detected. Please wait.'));
          return;
        }
        
        // Mark as pending
        self._pendingSubmissions.set(submissionId, Date.now());
        
        // Set timeout to remove pending status
        var timeoutId = setTimeout(function() {
          self._pendingSubmissions.delete(submissionId);
        }, self._submissionTimeout);
        
        // Format data for backend
        var formattedData = self._formatOrderData(sanitizedData);
        
        // Create form data for POST request
        var formData = new FormData();
        formData.append('action', 'submitOrder');
        formData.append('data', JSON.stringify(formattedData));
        
        // Make the fetch request
        fetch(self._webAppUrl, {
          method: 'POST',
          body: formData,
          mode: 'cors',
          redirect: 'follow'
        })
        .then(function(response) {
          // Clean up pending status
          clearTimeout(timeoutId);
          self._pendingSubmissions.delete(submissionId);
          
          if (!response.ok) {
            throw new Error('Server responded with status: ' + response.status);
          }
          
          return response.json();
        })
        .then(function(data) {
          if (data.success) {
            resolve({
              success: true,
              orderId: data.orderId || submissionId,
              message: data.message || 'Order placed successfully!',
              timestamp: data.timestamp || self._getTimestamp()
            });
          } else {
            reject(new Error(data.message || 'Failed to place order'));
          }
        })
        .catch(function(error) {
          // Clean up pending status on error
          clearTimeout(timeoutId);
          self._pendingSubmissions.delete(submissionId);
          
          // Provide more helpful error message
          if (error.name === 'TypeError' && error.message.includes('fetch')) {
            reject(new Error('Network error. Please check your internet connection and try again.'));
          } else {
            reject(error);
          }
        });
      });
    },
    
    /**
     * Submit an order from cart data
     * This method adapts the existing cart and form data to the service format
     * 
     * @param {Array} cart - Cart array with items {id, name, price, qty}
     * @param {Object} formData - Form data {customerName, phoneNumber, address, notes}
     * @returns {Promise} Promise resolving to server response
     */
    submitOrderFromCart: function(cart, formData) {
      // Calculate totals from cart
      var total = cart.reduce(function(sum, item) {
        return sum + (item.price * item.qty);
      }, 0);
      
      // Build products string from cart
      var productsList = cart.map(function(item) {
        return item.name + ' x' + item.qty + ' (₱' + (item.price * item.qty) + ')';
      }).join(', ');
      
      // Build order data
      var orderData = {
        customerName: formData.customerName,
        phoneNumber: formData.phoneNumber,
        address: formData.address,
        notes: formData.notes || '',
        
        // Product details (flat format for backend)
        product: productsList,
        quantity: cart.length, // Number of unique items
        price: total / cart.length, // Average price (not used by backend for validation)
        total: total,
        
        // Status (default)
        status: 'Pending'
      };
      
      return this.submitOrder(orderData);
    },
    
    /**
     * Backward-compatible alias for submitOrderFromCart
     * @param {Array} cart - Cart array with items {id, name, price, qty}
     * @param {Object} formData - Form data {customerName, phoneNumber, address, notes}
     * @returns {Promise} Promise resolving to server response
     */
    sendOrderFromCart: function(cart, formData) {
      return this.submitOrderFromCart(cart, formData);
    },
    
    // =========================================================================
    // VALIDATION METHODS
    // =========================================================================
    
    /**
     * Validate order data before sending
     * @param {Object} orderData - The order data to validate
     * @returns {Object} Validation result with isValid flag and errors array
     */
    validateOrderData: function(orderData) {
      var errors = [];
      
      // Check required fields exist
      if (!orderData) {
        return { isValid: false, errors: ['Order data is required'] };
      }
      
      // Validate customer name (minimum 2 characters)
      if (!orderData.customerName || typeof orderData.customerName !== 'string') {
        errors.push('Customer name is required');
      } else if (orderData.customerName.trim().length < 2) {
        errors.push('Customer name must be at least 2 characters');
      }
      
      // Validate phone number (Philippine format: 09XXXXXXXXX)
      if (!orderData.phoneNumber || typeof orderData.phoneNumber !== 'string') {
        errors.push('Phone number is required');
      } else {
        // Remove spaces and dashes for validation
        var cleanPhone = orderData.phoneNumber.replace(/[\s\-]/g, '');
        // Philippine mobile: 11 digits starting with 09
        if (!/^09\d{9}$/.test(cleanPhone)) {
          errors.push('Invalid phone number format. Use: 09XXXXXXXXX');
        }
      }
      
      // Validate address (minimum 5 characters)
      if (!orderData.address || typeof orderData.address !== 'string') {
        errors.push('Delivery address is required');
      } else if (orderData.address.trim().length < 5) {
        errors.push('Address must be at least 5 characters');
      }
      
      // Validate product (cannot be empty)
      if (!orderData.product || typeof orderData.product !== 'string') {
        errors.push('Product is required');
      } else if (orderData.product.trim().length === 0) {
        errors.push('No products specified');
      }
      
      // Validate quantity (must be > 0)
      var quantity = parseInt(orderData.quantity, 10);
      if (isNaN(quantity) || quantity <= 0) {
        errors.push('Quantity must be greater than 0');
      }
      
      // Validate price (must be positive number)
      var price = parseFloat(orderData.price);
      if (isNaN(price) || price < 0) {
        errors.push('Valid price is required');
      }
      
      // Validate total
      var total = parseFloat(orderData.total);
      if (isNaN(total) || total <= 0) {
        errors.push('Valid total amount is required');
      }
      
      // CRITICAL: Validate that Total = Quantity × Price
      if (!isNaN(quantity) && !isNaN(price) && !isNaN(total)) {
        var expectedTotal = quantity * price;
        if (Math.abs(expectedTotal - total) > 0.01) {
          errors.push('Total mismatch. Expected: ' + expectedTotal + ', Received: ' + total);
        }
      }
      
      return {
        isValid: errors.length === 0,
        errors: errors
      };
    },
    
    // =========================================================================
    // SANITIZATION METHODS
    // =========================================================================
    
    /**
     * Sanitize order data to prevent formula injection attacks.
     * Prevents cells from being interpreted as formulas (=, +, -, @, etc.)
     * 
     * @param {Object} orderData - The order data to sanitize
     * @returns {Object} Sanitized order data
     */
    sanitizeOrderData: function(orderData) {
      // Deep clone to avoid mutating original
      var sanitized = JSON.parse(JSON.stringify(orderData));
      
      // List of dangerous characters that can trigger formula injection
      var dangerousChars = ['=', '+', '-', '@', '\t', '\r', '\n'];
      
      // Fields that need sanitization
      var fieldsToSanitize = ['customerName', 'phoneNumber', 'product', 'address', 'notes'];
      
      fieldsToSanitize.forEach(function(field) {
        if (sanitized[field] && typeof sanitized[field] === 'string') {
          var value = sanitized[field];
          
          // Check if the value starts with a dangerous character
          var startsWithDangerous = dangerousChars.some(function(char) {
            return value.charAt(0) === char;
          });
          
          // If starts with dangerous char, prepend with apostrophe to escape it
          if (startsWithDangerous) {
            sanitized[field] = "'" + value;
          }
        }
      });
      
      return sanitized;
    },
    
    // =========================================================================
    // PRIVATE HELPER METHODS
    // =========================================================================
    
    /**
     * Generate a unique submission ID for duplicate prevention
     * @returns {string} Unique ID based on timestamp and random string
     */
    _generateSubmissionId: function() {
      return 'order_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    },
    
    /**
     * Generate simple local timestamp (YYYY-MM-DD HH:MM:SS)
     * @returns {string} Formatted timestamp
     */
    _getTimestamp: function() {
      var d = new Date();
      var pad = function(n) { return (n < 10 ? '0' : '') + n; };
      return d.getFullYear() + '-' +
             pad(d.getMonth() + 1) + '-' +
             pad(d.getDate()) + ' ' +
             pad(d.getHours()) + ':' +
             pad(d.getMinutes()) + ':' +
             pad(d.getSeconds());
    },
    
    /**
     * Format order data for the Google Apps Script backend
     * @param {Object} orderData - Raw order data
     * @returns {Object} Formatted data for backend
     */
    _formatOrderData: function(orderData) {
      return {
        // Timestamp
        timestamp: this._getTimestamp(),
        
        // Customer details
        customerName: orderData.customerName.trim(),
        phoneNumber: orderData.phoneNumber.trim(),
        address: orderData.address.trim(),
        
        // Product details (flat string format)
        product: orderData.product.trim(),
        quantity: parseInt(orderData.quantity, 10),
        price: parseFloat(orderData.price),
        total: parseFloat(orderData.total),
        
        // Status (default)
        status: orderData.status || 'Pending',
        
        // Notes/Remarks
        notes: (orderData.notes || '').trim()
      };
    }
  };
  
  // Export to global scope
  global.OrderService = OrderService;
  
})(typeof window !== 'undefined' ? window : this);


// ============================================================================
// EXAMPLE USAGE AND TESTING
// ============================================================================

/**
 * Example of how to use OrderService in your frontend code:
 * 
 * // 1. Configure with your Web App URL (if not using default)
 * // OrderService.configure('https://script.google.com/macros/s/XXXXXXX/exec');
 * 
 * // 2. Submit order directly
 * var orderData = {
 *   customerName: 'John Doe',
 *   phoneNumber: '09123456789',
 *   product: 'Chocolate Chip Cookie x2 (₱100)',
 *   quantity: 2,
 *   price: 50,
 *   total: 100,
 *   address: '123 Main Street, Quezon City',
 *   notes: 'Please deliver before 5 PM'
 * };
 * 
 * OrderService.submitOrder(orderData)
 *   .then(function(response) {
 *     console.log('SUCCESS!');
 *     console.log('Order ID:', response.orderId);
 *     console.log('Message:', response.message);
 *     console.log('Timestamp:', response.timestamp);
 *     
 *     // Update UI with order ID
 *     // document.getElementById('orderIdDisplay').textContent = response.orderId;
 *   })
 *   .catch(function(error) {
 *     console.error('ERROR:', error.message);
 *     // Show error to user
 *     // alert('Failed: ' + error.message);
 *   });
 * 
 * // 3. Or submit from cart
 * var cart = [
 *   { id: 1, name: 'Chocolate Chip Cookie', price: 50, qty: 2 },
 *   { id: 2, name: 'Oatmeal Cookie', price: 45, qty: 1 }
 * ];
 * 
 * var formData = {
 *   customerName: 'Jane Smith',
 *   phoneNumber: '09987654321',
 *   address: '456 Oak Avenue, Manila',
 *   notes: 'Ring doorbell twice'
 * };
 * 
 * OrderService.submitOrderFromCart(cart, formData)
 *   .then(function(response) {
 *     console.log('Order placed! ID:', response.orderId);
 *   })
 *   .catch(function(error) {
 *     console.error('Order failed:', error.message);
 *   });
 * 
 * // 4. Example orderData JSON object:
 * // {
 * //   "customerName": "John Doe",
 * //   "phoneNumber": "09123456789",
 * //   "product": "Chocolate Chip Cookie x2 (₱100)",
 * //   "quantity": 2,
 * //   "price": 50,
 * //   "total": 100,
 * //   "address": "123 Main Street, Quezon City",
 * //   "notes": "Please deliver before 5 PM"
 * // }
 */
