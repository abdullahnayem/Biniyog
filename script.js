// Main Application Class
class ContributionManager {
    constructor() {
        this.contributions = [];
        this.members = [
            'ভাই মো: সোহেল', 'ভাই মো: মাহফুজ', 'ভাই মো: শফিউল', 'ভাই মো: জুবায়ের', 'ভাই মো: মুকুল',
            'ভাই মো: ইমরান', 'ভাই মো: তাওহিদ', 'ভাই মো: আবু বকর', 'ভাই মো: নাঈম'
        ];
        this.currentMember = null;
        this.initialize();
    }

    initialize() {
        this.setupEventListeners();
        this.updateDashboard();
        this.renderMembers();
        this.setTodayDate();
        
        // Show loading state
        this.showSuccessMessage('ডেটা লোড হচ্ছে...');

        // Check login status
        const isLoggedIn = sessionStorage.getItem('isLoggedIn') === 'true';
        this.setLoggedIn(isLoggedIn);
    }

    setupEventListeners() {
        const form = document.getElementById('contributionForm');
        form.addEventListener('submit', (e) => this.handleSubmit(e));

        const modal = document.getElementById('memberModal');
        const closeBtn = modal.querySelector('.close');
        closeBtn.addEventListener('click', () => this.closeModal());
        window.addEventListener('click', (e) => {
            if (e.target === modal) this.closeModal();
        });

        const currentMonthCard = document.getElementById('currentMonthCard');
        if (currentMonthCard) {
            currentMonthCard.addEventListener('click', () => this.showCurrentMonthDetails());
        }

        // Login listeners
        document.getElementById('loginBtn').addEventListener('click', () => {
            document.getElementById('loginModal').style.display = 'block';
            document.getElementById('loginError').style.display = 'none';
        });
        
        document.getElementById('closeLogin').addEventListener('click', () => {
            document.getElementById('loginModal').style.display = 'none';
        });
        
        document.getElementById('submitLogin').addEventListener('click', () => this.handleLogin());
        document.getElementById('logoutBtn').addEventListener('click', () => this.handleLogout());
        
        // Close login modal on outside click
        window.addEventListener('click', (e) => {
            const loginModal = document.getElementById('loginModal');
            if (e.target === loginModal) {
                loginModal.style.display = 'none';
            }
        });
    }

    setTodayDate() {
        const today = new Date().toISOString().split('T')[0];
        const dateInput = document.getElementById('date');
        if (dateInput) {
            dateInput.value = today;
        }
    }

    handleLogin() {
        const user = document.getElementById('usernameInput').value;
        const pass = document.getElementById('passwordInput').value;
        
        if (user === 'admin' && pass === 'bismillah') {
            this.setLoggedIn(true);
            document.getElementById('loginModal').style.display = 'none';
            document.getElementById('usernameInput').value = '';
            document.getElementById('passwordInput').value = '';
            this.showSuccessMessage('লগইন সফল হয়েছে!');
        } else {
            document.getElementById('loginError').style.display = 'block';
        }
    }

    handleLogout() {
        this.setLoggedIn(false);
        this.showSuccessMessage('লগআউট সফল হয়েছে!');
    }

    setLoggedIn(isLoggedIn) {
        const formSection = document.getElementById('formSection');
        const loginBtn = document.getElementById('loginBtn');
        const logoutBtn = document.getElementById('logoutBtn');
        const mainContent = document.querySelector('.main-content');
        
        if (isLoggedIn) {
            formSection.style.display = 'block';
            loginBtn.style.display = 'none';
            logoutBtn.style.display = 'inline-block';
            sessionStorage.setItem('isLoggedIn', 'true');
            if (window.innerWidth > 768) {
                mainContent.style.gridTemplateColumns = '1fr 2fr';
            }
        } else {
            formSection.style.display = 'none';
            loginBtn.style.display = 'inline-block';
            logoutBtn.style.display = 'none';
            sessionStorage.removeItem('isLoggedIn');
            mainContent.style.gridTemplateColumns = '1fr';
        }
    }

    handleSubmit(e) {
        e.preventDefault();
        
        const memberSelect = document.getElementById('memberSelect');
        const amountInput = document.getElementById('amount');
        const dateInput = document.getElementById('date');
        const notesInput = document.getElementById('notes');

        const contribution = {
            member: memberSelect.value,
            amount: parseInt(amountInput.value),
            date: dateInput.value,
            notes: notesInput.value,
            timestamp: new Date().toISOString(),
            receiptId: this.generateReceiptId()
        };
   this.generatePDFReceipt(contribution);
        //this.addContribution(contribution);
        
        // Reset form
        memberSelect.value = '';
        amountInput.value = '5000';
        notesInput.value = '';
        this.setTodayDate();
    }

    generateReceiptId() {
        const date = new Date();
        const year = date.getFullYear().toString().slice(-2);
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const random = Math.random().toString(36).substr(2, 6).toUpperCase();
        
        return `REC-${year}${month}${day}-${random}`;
    }

    addContribution(contribution) {
        this.contributions.push(contribution);
        this.updateDashboard();
        this.renderMembers();
        this.generatePDFReceipt(contribution);
        
        // Auto-sync to Google Sheets
        if (window.googleSheets) {
            window.googleSheets.syncContribution(contribution);
        }
        
        this.showSuccessMessage('অবদান সফলভাবে যোগ করা হয়েছে! রসিদ ডাউনলোড হচ্ছে...');
    }

    setContributions(data) {
        this.contributions = data;
        this.updateDashboard();
        this.renderMembers();
    }

    updateDashboard() {
        const totalAmount = this.contributions.reduce((sum, cont) => sum + cont.amount, 0);
        
        // Calculate current month's collection
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        const currentMonthTotal = this.contributions.reduce((sum, cont) => {
            const contDate = new Date(cont.date);
            if (contDate.getMonth() === currentMonth && contDate.getFullYear() === currentYear) {
                return sum + cont.amount;
            }
            return sum;
        }, 0);

        document.getElementById('totalAmount').textContent = `${totalAmount.toLocaleString()} টাকা`;
        
        const currentMonthEl = document.getElementById('currentMonthCollection');
        if (currentMonthEl) {
            currentMonthEl.textContent = `${currentMonthTotal.toLocaleString()} টাকা`;
        }
        
        document.getElementById('totalMembers').textContent = `${this.members.length} জন`;
    }

    renderMembers() {
        const container = document.getElementById('membersContainer');
        container.innerHTML = '';

        const memberContributions = this.getMemberContributions();

        this.members.forEach(member => {
            const total = memberContributions[member] || 0;
            const card = this.createMemberCard(member, total);
            container.appendChild(card);
        });
    }

    getMemberContributions() {
        return this.contributions.reduce((acc, cont) => {
            acc[cont.member] = (acc[cont.member] || 0) + cont.amount;
            return acc;
        }, {});
    }

    createMemberCard(member, total) {
        const card = document.createElement('div');
        card.className = 'member-card';
        card.innerHTML = `
            <h4>${member}</h4>
            <p>মোট অবদান: ${total.toLocaleString()} টাকা</p>
        `;

        card.addEventListener('click', () => this.showMemberDetails(member));
        return card;
    }

    showMemberDetails(member) {
        this.currentMember = member;
        const modal = document.getElementById('memberModal');
        const modalTitle = document.getElementById('modalTitle');
        const detailsContainer = document.getElementById('memberDetails');

        const memberContributions = this.contributions
            .filter(cont => cont.member === member)
            .sort((a, b) => new Date(b.date) - new Date(a.date));

        const total = memberContributions.reduce((sum, cont) => sum + cont.amount, 0);

        modalTitle.textContent = `${member} - বিবরণ`;
        
        detailsContainer.innerHTML = `
            <div style="margin-bottom: 20px;">
                <h3>মোট অবদান: ${total.toLocaleString()} টাকা</h3>
                <p>মোট জমা: ${memberContributions.length} বার</p>
            </div>
            <h4>জমার তালিকা:</h4>
            ${memberContributions.length > 0 ? 
                memberContributions.map(cont => `
                    <div class="contribution-item">
                        <p><strong>পরিমাণ:</strong> ${cont.amount.toLocaleString()} টাকা</p>
                        <p><strong>তারিখ:</strong> ${this.formatDate(cont.date)}</p>
                        <p><strong>রসিদ নং:</strong> ${cont.receiptId}</p>
                        ${cont.notes ? `<p><strong>মন্তব্য:</strong> ${cont.notes}</p>` : ''}
                    </div>
                `).join('') : 
                '<p>কোনো জমা পাওয়া যায়নি</p>'
            }
        `;

        modal.style.display = 'block';
    }

    showCurrentMonthDetails() {
        const modal = document.getElementById('memberModal');
        const modalTitle = document.getElementById('modalTitle');
        const detailsContainer = document.getElementById('memberDetails');

        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        const monthNames = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];

        const currentMonthContributions = this.contributions
            .filter(cont => {
                const contDate = new Date(cont.date);
                return contDate.getMonth() === currentMonth && contDate.getFullYear() === currentYear;
            })
            .sort((a, b) => new Date(b.date) - new Date(a.date));

        const total = currentMonthContributions.reduce((sum, cont) => sum + cont.amount, 0);

        modalTitle.textContent = `${monthNames[currentMonth]} ${currentYear} - বিবরণ`;
        
        detailsContainer.innerHTML = `
            <div style="margin-bottom: 20px;">
                <h3>মোট সংগ্রহ: ${total.toLocaleString()} টাকা</h3>
                <p>মোট জমা: ${currentMonthContributions.length} বার</p>
            </div>
            <h4>জমার তালিকা:</h4>
            ${currentMonthContributions.length > 0 ? 
                currentMonthContributions.map(cont => `
                    <div class="contribution-item">
                        <p><strong>নাম:</strong> ${cont.member}</p>
                        <p><strong>পরিমাণ:</strong> ${cont.amount.toLocaleString()} টাকা</p>
                        <p><strong>তারিখ:</strong> ${this.formatDate(cont.date)}</p>
                        <p><strong>রসিদ নং:</strong> ${cont.receiptId}</p>
                        ${cont.notes ? `<p><strong>মন্তব্য:</strong> ${cont.notes}</p>` : ''}
                    </div>
                `).join('') : 
                '<p>এই মাসে কোনো জমা পাওয়া যায়নি</p>'
            }
        `;

        modal.style.display = 'block';
    }

    closeModal() {
        document.getElementById('memberModal').style.display = 'none';
        this.currentMember = null;
    }

    async generatePDFReceipt(contribution) {
        const { jsPDF } = window.jspdf;
        
        // Create receipt HTML structure
        const receiptDiv = document.createElement('div');
        receiptDiv.id = 'receipt-temp';
        receiptDiv.style.cssText = `
            position: fixed;
            top: -9999px;
            left: 0;
            width: 210mm;
            min-height: 297mm;
            padding: 20mm;
            background: white;
            color: black;
            font-family: 'Arial', sans-serif;
            box-sizing: border-box;
            z-index: 10000;
        `;

        const amountInWords = this.amountToWords(contribution.amount);

        receiptDiv.innerHTML = `
            <div style="border: 2px solid #333; padding: 40px; position: relative;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="margin: 0; color: #2c3e50; font-size: 28px;">সমন্বয় সমিতি</h1>
                    <h2 style="margin: 5px 0; font-size: 18px; color: #555;">Somonnoy Somiti</h2>
                    <div style="margin-top: 15px; border: 1px solid #333; display: inline-block; padding: 5px 20px; border-radius: 20px;">
                        <span style="font-weight: bold; font-size: 16px;">Money Receipt / জমার রসিদ</span>
                    </div>
                </div>
                
                <div style="display: flex; justify-content: space-between; margin-bottom: 30px; border-bottom: 1px dashed #ccc; padding-bottom: 20px;">
                    <div>
                        <p style="margin: 5px 0;"><strong>Receipt No / রসিদ নং:</strong> ${contribution.receiptId}</p>
                    </div>
                    <div>
                        <p style="margin: 5px 0;"><strong>Date / তারিখ:</strong> ${this.formatDate(contribution.date)}</p>
                    </div>
                </div>
                
                <div style="font-size: 16px; line-height: 2;">
                    <p style="border-bottom: 1px dotted #999; padding-bottom: 5px;">
                        <strong>Received From / জমাকারীর নাম:</strong> 
                        <span style="margin-left: 10px;">${contribution.member}</span>
                    </p>
                    
                    <p style="border-bottom: 1px dotted #999; padding-bottom: 5px;">
                        <strong>Amount / টাকার পরিমাণ:</strong> 
                        <span style="margin-left: 10px;">${contribution.amount.toLocaleString()} BDT</span>
                    </p>
                    
                    <p style="border-bottom: 1px dotted #999; padding-bottom: 5px;">
                        <strong>In Words / কথায়:</strong> 
                        <span style="margin-left: 10px;">${amountInWords}</span>
                    </p>
                    
                    ${contribution.notes ? `
                    <p style="border-bottom: 1px dotted #999; padding-bottom: 5px;">
                        <strong>Note / মন্তব্য:</strong> 
                        <span style="margin-left: 10px;">${contribution.notes}</span>
                    </p>` : ''}
                </div>
                
                <div style="margin-top: 80px; display: flex; justify-content: space-between; padding: 0 20px;">
                    <div style="text-align: center;">
                        <div style="border-top: 1px solid #333; width: 200px; margin: 0 auto;"></div>
                        <p style="font-size: 14px; margin-top: 10px;">Depositor's Signature<br>জমাকারীর স্বাক্ষর</p>
                    </div>
                    <div style="text-align: center;">
                        <div style="border-top: 1px solid #333; width: 200px; margin: 0 auto;"></div>
                        <p style="font-size: 14px; margin-top: 10px;">Authorized Signature<br>কর্তৃপক্ষের স্বাক্ষর</p>
                    </div>
                </div>

                <div style="position: absolute; bottom: 20px; left: 0; width: 100%; text-align: center; font-size: 10px; color: #999;">
                    This is a computer generated receipt.
                </div>
            </div>
        `;

        document.body.appendChild(receiptDiv);

        try {
            // Use html2canvas to render the element
            const canvas = await html2canvas(receiptDiv, {
                scale: 2, // Better quality
                useCORS: true,
                logging: false
            });
            
            const imgData = canvas.toDataURL('image/jpeg', 1.0);
            const doc = new jsPDF('p', 'mm', 'a4');
            
            const pdfWidth = doc.internal.pageSize.getWidth();
            const pdfHeight = doc.internal.pageSize.getHeight();
            
            // Add image to PDF (fit to width)
            const imgProps = doc.getImageProperties(imgData);
            const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
            
            doc.addImage(imgData, 'JPEG', 0, 0, pdfWidth, imgHeight);
            
            const dateObj = new Date(contribution.date);
            const monthName = dateObj.toLocaleString('en-US', { month: 'long' });
            const safeMemberName = contribution.member.replace(/[:\/\\*?"<>|]/g, '-');
            
            doc.save(`${safeMemberName}_${monthName}_${contribution.date}.pdf`);
            
        } catch (error) {
       
            this.showErrorMessage('রসিদ জেনারেট করতে সমস্যা হয়েছে');
        } finally {
            document.body.removeChild(receiptDiv);
        }
    }

    amountToWords(amount) {
        const units = ['', 'এক', 'দুই', 'তিন', 'চার', 'পাঁচ', 'ছয়', 'সাত', 'আট', 'নয়'];
        const numbersUnderHundred = [
            'শূন্য', 'এক', 'দুই', 'তিন', 'চার', 'পাঁচ', 'ছয়', 'সাত', 'আট', 'নয়',
            'দশ', 'এগারো', 'বারো', 'তেরো', 'চৌদ্দ', 'পনেরো', 'ষোলো', 'সতেরো', 'আঠারো', 'উনিশ',
            'বিশ', 'একুশ', 'বাইশ', 'তেইশ', 'চব্বিশ', 'পঁচিশ', 'ছাব্বিশ', 'সাতাশ', 'আঠাশ', 'উনত্রিশ',
            'ত্রিশ', 'একত্রিশ', 'বত্রিশ', 'তেত্রিশ', 'চৌত্রিশ', 'পঁয়ত্রিশ', 'ছত্রিশ', 'সাঁইত্রিশ', 'আটত্রিশ', 'উনচল্লিশ',
            'চল্লিশ', 'একচল্লিশ', 'বিয়াল্লিশ', 'তেতাল্লিশ', 'চুয়াল্লিশ', 'পঁয়তাল্লিশ', 'ছেচল্লিশ', 'সাতচল্লিশ', 'আটচল্লিশ', 'উনপঞ্চাশ',
            'পঞ্চাশ', 'একান্ন', 'বাহান্ন', 'তিপ্পান্ন', 'চুয়ান্ন', 'পঞ্চান্ন', 'ছাপ্পান্ন', 'সাতান্ন', 'আটান্ন', 'উনষাট',
            'ষাট', 'একষট্টি', 'বাষট্টি', 'তেষট্টি', 'চৌষট্টি', 'পঁয়ষট্টি', 'ছেষট্টি', 'সাতষট্টি', 'আটষট্টি', 'উনসত্তর',
            'সত্তর', 'একাত্তর', 'বাহাত্তর', 'তিয়াত্তর', 'চুয়াত্তর', 'পঁচাত্তর', 'ছিয়াত্তর', 'সাতাত্তর', 'আটাত্তর', 'উনআশি',
            'আশি', 'একাশি', 'বিরাশি', 'তিরাশি', 'চুরাশি', 'পঁচাশি', 'ছিয়াশি', 'সাতাশি', 'আটাশি', 'উননব্বই',
            'নব্বই', 'একানব্বই', 'বিরানব্বই', 'তিরানব্বই', 'চুরানব্বই', 'পঁচানব্বই', 'ছিয়ানব্বই', 'সাতানব্বই', 'আটানব্বই', 'নিরানব্বই'
        ];

        const convertNumber = (value) => {
            if (value === 0) return '';
            if (value < 100) return numbersUnderHundred[value];

            let words = '';

            if (value >= 10000000) {
                words += convertNumber(Math.floor(value / 10000000)) + ' কোটি ';
                value %= 10000000;
            }

            if (value >= 100000) {
                words += convertNumber(Math.floor(value / 100000)) + ' লক্ষ ';
                value %= 100000;
            }

            if (value >= 1000) {
                words += convertNumber(Math.floor(value / 1000)) + ' হাজার ';
                value %= 1000;
            }

            if (value >= 100) {
                words += units[Math.floor(value / 100)] + ' শত ';
                value %= 100;
            }

            if (value > 0) {
                words += numbersUnderHundred[value];
            }

            return words.trim();
        };

        if (amount === 0) return 'শূন্য টাকা';

        return convertNumber(amount) + ' টাকা';
    }

    printMemberStatement() {
        if (!this.currentMember) return;
        
        const memberContributions = this.contributions
            .filter(cont => cont.member === this.currentMember)
            .sort((a, b) => new Date(a.date) - new Date(b.date));

        const total = memberContributions.reduce((sum, cont) => sum + cont.amount, 0);
        
        const printContent = `
            <div class="receipt-container">
                <h2>${this.currentMember} - আর্থিক বিবরণী</h2>
                <p>মোট অবদান: ${total.toLocaleString()} টাকা</p>
                <p>মোট জমা: ${memberContributions.length} বার</p>
                <hr>
                <h3>জমার তালিকা:</h3>
                ${memberContributions.map(cont => `
                    <div style="margin: 10px 0; padding: 10px; border-left: 4px solid #007bff;">
                        <p><strong>পরিমাণ:</strong> ${cont.amount.toLocaleString()} টাকা</p>
                        <p><strong>তারিখ:</strong> ${this.formatDate(cont.date)}</p>
                        <p><strong>রসিদ নং:</strong> ${cont.receiptId}</p>
                        ${cont.notes ? `<p><strong>মন্তব্য:</strong> ${cont.notes}</p>` : ''}
                    </div>
                `).join('')}
                <hr>
                <p style="text-align: center; margin-top: 20px;">
                    প্রিন্টের তারিখ: ${this.formatDate(new Date().toISOString().split('T')[0])}
                </p>
            </div>
        `;

        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>${this.currentMember} - আর্থিক বিবরণী</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    .receipt-container { max-width: 800px; margin: 0 auto; }
                    h2, h3 { color: #333; text-align: center; }
                    hr { margin: 20px 0; border: 1px solid #ddd; }
                </style>
            </head>
            <body>${printContent}</body>
            </html>
        `);
        
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
    }

    exportToExcel() {
        if (this.contributions.length === 0) {
            this.showErrorMessage('এখনও কোনো ডেটা নেই!');
            return;
        }

        let csvContent = "সদস্য,পরিমাণ (টাকা),তারিখ,মন্তব্য,রসিদ নং\n";
        
        this.contributions.forEach(cont => {
            const row = [
                cont.member,
                cont.amount,
                cont.date,
                cont.notes || '',
                cont.receiptId
            ].map(field => `"${field}"`).join(',');
            
            csvContent += row + '\n';
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `সমন্বয়_সমিতি_ডেটা_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        this.showSuccessMessage('এক্সেল ফাইল ডাউনলোড করা হয়েছে!');
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('bn-BD', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    showSuccessMessage(message) {
        this.showMessage(message, 'status-success');
    }

    showErrorMessage(message) {
        this.showMessage(message, 'status-error');
    }

    showMessage(message, type) {
        const alert = document.createElement('div');
        alert.className = `status-message ${type}`;
        alert.textContent = message;
        
        document.body.appendChild(alert);
        
        setTimeout(() => {
            alert.remove();
        }, 3000);
    }
}

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    window.app = new ContributionManager();
});
