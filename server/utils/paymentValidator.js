// Payment Validation utility imitating a real gateway logic

function passesLuhnCheck(cardNumber) {
    cardNumber = cardNumber.replace(/\D/g, ''); // Remove non-digits
    if (cardNumber.length < 13 || cardNumber.length > 19) return false;
    
    let sum = 0;
    let shouldDouble = false;
    
    // Loop through values starting from the rightmost digit
    for (let i = cardNumber.length - 1; i >= 0; i--) {
        let digit = parseInt(cardNumber.charAt(i));
        
        if (shouldDouble) {
            digit *= 2;
            if (digit > 9) digit -= 9;
        }
        
        sum += digit;
        shouldDouble = !shouldDouble;
    }
    
    return (sum % 10) === 0;
}

function isValidExpiry(expiry) {
    // Format MM/YY
    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(expiry)) return false;
    
    const [month, year] = expiry.split('/');
    const expiryDate = new Date(`20${year}`, month - 1);
    const today = new Date();
    today.setDate(1); // Set to start of month for fair comparison
    
    return expiryDate >= today;
}

function isValidCVV(cvv) {
    return /^[0-9]{3,4}$/.test(cvv);
}

module.exports = { passesLuhnCheck, isValidExpiry, isValidCVV };
