# আসেন খাই কল্যাণ তহবিল - রান করার গাইড (Startup Guide)

আজকের সমস্ত পরিবর্তন (লোগো সেটিংস, ডিলিট অপশন, হোম পোর্টাল পেজ, এবং প্রিন্ট/PDF ফিচার) সফলভাবে সেভ করা হয়েছে। ভবিষ্যতে অ্যাপটি চালু করার জন্য নিচের নিয়মগুলো অনুসরণ করুন:

---

## ১. ডেভেলপমেন্ট মোড (Development Mode - রিকমেন্ডেড)
*এই মোডে ফ্রন্টএন্ড `localhost:3000` এবং ব্যাকএন্ড `localhost:5000` এ চলে। কোড এডিট করলে অটো-রিফ্রেশ হয়।*

আপনাকে **দুটি আলাদা টার্মিনাল/PowerShell উইন্ডো** ওপেন করতে হবে:

### টার্মিনাল ১ (ব্যাকএন্ড চালু করার জন্য):
নিচের কমান্ডগুলো রান করুন:
```powershell
cd C:\Users\user\.gemini\antigravity\scratch\welfare-fund-app\backend
npm start
```

### টার্মিনাল ২ (ফ্রন্টএন্ড চালু করার জন্য):
নিচের কমান্ডগুলো রান করুন:
```powershell
cd C:\Users\user\.gemini\antigravity\scratch\welfare-fund-app\ui
npm run dev
```

**ব্রাউজারে ওপেন করুন:** 👉 **[http://localhost:3000](http://localhost:3000)**

---

## ২. প্রোডাকশন মোড (Production Mode)
*এই মোডে শুধুমাত্র ব্যাকএন্ড সার্ভার চালু করলেই ব্যাকএন্ড নিজেই ফ্রন্টএন্ডকে সার্ভ করে। একটিমাত্র টার্মিনাল দিয়েই কাজ হয়ে যায়।*

### ধাপ ১ (কোড পরিবর্তন করলে কেবল একবার বিল্ড করতে হবে):
টার্মিনালে রান করুন:
```powershell
cd C:\Users\user\.gemini\antigravity\scratch\welfare-fund-app\ui
npm run build
```

### ধাপ ২ (সার্ভার চালু করা):
টার্মিনালে রান করুন:
```powershell
cd C:\Users\user\.gemini\antigravity\scratch\welfare-fund-app\backend
npm start
```

**ব্রাউজারে ওপেন করুন:** 👉 **[http://localhost:5000](http://localhost:5000)** (অথবা `http://127.0.0.1:5000`)

---

## লোগো ইমেজ সেটিংস (Logo Settings Reminder)
আপনার লোগোটি যেন সবসময় পারফেক্টলি শো করে, সেজন্য আপনার লোগো ফাইলটি নিচের ডিরেক্টরিতে রাখতে হবে:
📂 `welfare-fund-app\ui\public\logo.png`
