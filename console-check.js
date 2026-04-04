/**
 * Paste this in the browser console (F12) to check Firebase status
 * Usage: Just copy-paste the entire file contents and press Enter
 */

(async function checkFirebaseStatus() {
    console.clear();
    console.log('%c🔍 StudentOS Firebase Status Check', 'font-size: 20px; font-weight: bold; color: #00d4ff;');
    console.log('═══════════════════════════════════════════════\n');

    // Import Firebase from global scope (assuming it's loaded)
    const checkAuth = () => {
        try {
            // Try to access firebase auth from window
            if (!window.firebase && !window.auth) {
                console.log('⚠️  Firebase not detected in global scope');
                console.log('💡 This check must run from within your app pages\n');
                return null;
            }
            return true;
        } catch (e) {
            console.error('❌ Error accessing Firebase:', e.message);
            return null;
        }
    };

    const authStatus = checkAuth();
    if (!authStatus) {
        console.log('\n📋 TO USE THIS TOOL:');
        console.log('1. Make sure you are logged in');
        console.log('2. Open any page in your StudentOS app');
        console.log('3. Press F12 → Console tab');
        console.log('4. Paste this script again\n');
        return;
    }

    // If running in React DevTools, access via __REACT_DEVTOOLS_GLOBAL_HOOK__
    console.log('✅ Running in StudentOS app context\n');

    // Manual checks the user can do
    console.log('%c📝 MANUAL CHECKS:', 'font-weight: bold; color: #ffa500;');
    console.log('');

    console.log('1️⃣  Check Authentication:');
    console.log('   Open: Dashboard');
    console.log('   Look for: Your name in the greeting');
    console.log('   ✅ Shows your name = Logged in');
    console.log('   ❌ Shows "Student" = Not logged in\n');

    console.log('2️⃣  Check Tasks Loading:');
    console.log('   Open: Todos page');
    console.log('   Look for: List of your tasks');
    console.log('   ✅ Tasks visible = Database working');
    console.log('   ❌ Empty or loading forever = Database issue\n');

    console.log('3️⃣  Check Events Loading:');
    console.log('   Open: Calendar page');
    console.log('   Look for: Your scheduled events');
    console.log('   ✅ Events visible = Calendar working');
    console.log('   ❌ Empty calendar = No events yet (normal for new users)\n');

    console.log('4️⃣  Test AI Planner:');
    console.log('   Open: AI Schedule page');
    console.log('   Type: "Add a task to test"');
    console.log('   ✅ See "✅ Task saved" in console = AI working');
    console.log('   ❌ See "❌ Failed" = AI issue\n');

    console.log('5️⃣  Run Full Test:');
    console.log('   Open: Dashboard');
    console.log('   Click: "⚡ Run System Test" button');
    console.log('   ✅ All checkmarks = Everything works!');
    console.log('   ❌ Any X marks = Check which feature failed\n');

    console.log('%c📊 QUICK STATUS:', 'font-weight: bold; color: #00ff00;');
    console.log('');
    console.log('🌐 App Running:', window.location.href);
    console.log('📦 Local Storage Keys:', Object.keys(localStorage).filter(k => k.includes('chat') || k.includes('saved')));
    console.log('');

    console.log('%c🎯 RECOMMENDED NEXT STEP:', 'font-weight: bold; color: #ff00ff;');
    console.log('');
    console.log('Go to Dashboard → Click "⚡ Run System Test"');
    console.log('This will test all 6 features automatically!\n');

    console.log('═══════════════════════════════════════════════');
    console.log('%cCheck complete! Follow the steps above. 🚀', 'color: #00d4ff;');
})();
