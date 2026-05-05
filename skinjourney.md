# SKIN JOURNEY FLOW - AI Face Analysis
## Complete Flow Structure & Ready-to-Use Prompts

---

## FLOW STRUCTURE

### 1️⃣ FACE ANALYSIS (AI Detection)
```
Sistem AI menganalisis wajah pengguna
     ↓
Identifikasi: Jenis kulit, masalah kulit, kondisi
     ↓
Generate: Profile skincare personal
```

---

### 2️⃣ SET PROGRAM (Pilih Rutinitas)
```
Tampilkan pilihan program:
- Essential Basic (3 langkah)
- Advanced (5 langkah)  
- Intensive (7 langkah)
     ↓
Pengguna pilih berdasarkan skin condition & lifestyle
```

---

### 3️⃣ LIST PRODUK (Rekomendasi)
```
Program dipilih
     ↓
Sistem tampilkan:
- Produk yang cocok
- Ingredients key
- Fungsi masing-masing
- Harga & ukuran
     ↓
Pengguna bisa add/remove produk
```

---

### 4️⃣ STEP PENGGUNAAN (To-Do List)
```
Langkah-langkah penggunaan:
- Step 1: Cleanse
- Step 2: Tone/Essence
- Step 3: Treatment (serum/ampoule)
- Step 4: Moisturize
- Step 5: SPF (pagi saja)
     ↓
Checkbox untuk tracking
```

---

### 5️⃣ CARA PAKAI (Detailed Instructions - To-Do List)
```
Untuk SETIAP produk:
- Deskripsi produk
- Tekstur & aroma
- Cara aplikasi (technique)
- Jumlah pemakaian
- Frekuensi (pagi/malam/kedua)
- Tips & trik
- Waktu terbaik apply
     ↓
Interactive checklist dengan timer
```

---

### 6️⃣ PERAWATAN LANJUTAN (Advanced Care)
```
Setelah routine dasar stabil (2-4 minggu):
- Weekly treatment (mask, exfoliating)
- Monthly intensive care
- Seasonal adjustments
- Problem-solving (acne, hyperpigmentation, dll)
- Lifestyle tips (diet, sleep, stress)
     ↓
Adjustment suggestions berdasarkan hasil
```

---

## DETAILED PROMPTS - SIAP COPY PASTE

### PROMPT 1️⃣: Face Analysis & Skin Profile
```
Analyze my skin using AI. I'll describe my face:

[USER INPUT DESCRIPTION]

Based on my description, please identify:
1. Skin type (oily/dry/combination/sensitive/normal)
2. Main skin concerns (acne, dark spots, wrinkles, texture, redness, etc)
3. Skin condition (baseline health assessment)
4. Skin tone & undertone if visible
5. Environmental factors affecting skin

Create a "Skin Profile Card" showing:
- Skin Type: [type]
- Age: [age if provided]
- Main Concerns: [list]
- Skin Condition: [good/fair/needs-improvement]
- Sensitivity Level: [low/medium/high]
- Hydration Status: [dehydrated/normal/over-hydrated]

Then recommend 3 program options:
1. ESSENTIAL BASIC - for beginners or busy lifestyle
2. ADVANCED - for moderate concerns, 5 steps
3. INTENSIVE - for complex concerns, 7 steps

Ask: "Which program appeals to you most?"
```

---

### PROMPT 2️⃣: Set Program Selection
```
SELECTED PROGRAM: [Essential/Advanced/Intensive]

Create a program card showing:
- Program Name
- Number of steps
- Time commitment per day
- Best for: [skin types]
- Expected results timeline
- Flexibility options

Then display: "Here's your personalized routine structure:"

Step breakdown:
1. Morning routine (X minutes)
2. Evening routine (X minutes)
3. Weekly treatments
4. Monthly intensive care

Ask for confirmation: "Ready to see your product recommendations?"
```

---

### PROMPT 3️⃣: Product Recommendation List
```
Based on your [skin type] skin and [main concerns], here are recommended products:

For [MORNING ROUTINE]:
┌─ PRODUCT 1: [Name]
│  ├─ Type: [Classification]
│  ├─ Main Ingredients: [Key 3-4]
│  ├─ Function: [What it does]
│  ├─ Texture: [Description]
│  ├─ Price: [Range]
│  ├─ Size: [ml/oz]
│  └─ Why: [Why for your skin]
│
├─ PRODUCT 2: [Name]
│  ├─ Type: [Classification]
│  ├─ Main Ingredients: [Key 3-4]
│  ├─ Function: [What it does]
│  ├─ Texture: [Description]
│  ├─ Price: [Range]
│  ├─ Size: [ml/oz]
│  └─ Why: [Why for your skin]
│
└─ PRODUCT 3: [SPF/Sunscreen]
   ├─ Type: [Sunscreen type]
   ├─ SPF Level: [SPF rating]
   ├─ Main Ingredients: [Key 2-3]
   ├─ Function: UV protection
   ├─ Texture: [Description]
   ├─ Price: [Range]
   └─ Size: [ml/oz]

For [EVENING ROUTINE]:
┌─ PRODUCT 4: [Name]
│  └─ [Same structure as above]
│
├─ PRODUCT 5: [Name]
│  └─ [Same structure as above]
│
└─ [Additional if needed]

For [WEEKLY TREATMENT]:
└─ PRODUCT: [Name]
   └─ [Treatment product details]

Alternative options available for: [which steps]

Display: ✓ Products selected | ⊕ Add alternatives | ✎ Customize | ✓ Continue

Ask: "Happy with these products? Or would you like alternatives for any step?"
```

---

### PROMPT 4️⃣: Step Penggunaan - Daily Routine Structure
```
YOUR SKINCARE ROUTINE - DAILY STEPS TO-DO LIST

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌅 MORNING ROUTINE (5-10 minutes)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Step 1: CLEANSE
☐ Wet face with lukewarm water
☐ Apply cleanser
☐ Massage for 30-60 seconds
☐ Rinse thoroughly
Time: 1-2 min

Step 2: TONE/ESSENCE
☐ Pat face dry with clean towel
☐ Apply toner/essence
☐ Wait 20-30 seconds to absorb
Time: 1 min

Step 3: TREATMENT SERUM
☐ Apply serum in dots
☐ Pat and press into skin
☐ Wait 1-2 minutes
Time: 2 min

Step 4: MOISTURIZER
☐ Take appropriate amount
☐ Warm between palms
☐ Press into face and neck
☐ Focus on dry areas
Time: 1 min

Step 5: SPF/SUNSCREEN
☐ Apply evenly on face, neck, ears
☐ Reapply every 2 hours if needed
☐ Allow to set for 1 minute
Time: 1 min

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌙 EVENING ROUTINE (5-10 minutes)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Step 1: CLEANSE
☐ Use cleanser to remove makeup
☐ Massage gently
☐ Rinse thoroughly
Time: 1-2 min

Step 2: TONE/ESSENCE
☐ Apply toner/essence
☐ Let absorb
Time: 1 min

Step 3: TARGETED TREATMENT
☐ Apply treatment product
☐ Focus on problem areas
Time: 2 min

Step 4: MOISTURIZER
☐ Apply night moisturizer
☐ Use richer formula if needed
Time: 1 min

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📅 WEEKLY TREATMENT (Once per week)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Best day: [Wednesday or Friday recommended]
Best time: [Evening routine day]

☐ Do regular cleanse
☐ Apply treatment mask/exfoliant
☐ Leave on for [recommended time]
☐ Rinse thoroughly
☐ Continue with regular moisturizer

Display: 🔄 Repeat daily | 📊 Track progress | 💡 Tips & tricks
```

---

### PROMPT 5️⃣: Cara Pakai - Detailed Instructions (Per-Product)
```
HOW TO USE: [PRODUCT NAME]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 PRODUCT OVERVIEW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Category: [Cleanser/Toner/Serum/Moisturizer/etc]
Texture: [Gel/Cream/Liquid/Foam/etc]
Fragrance: [Unscented/Light/Strong]
Shelf life after opening: [duration]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 HOW TO APPLY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Amount needed:
- Face: [pea-size/2 pumps/3 drops]
- Full body: [appropriate amount if applicable]

Application technique:
1. ☐ [Step 1 - first action]
2. ☐ [Step 2 - second action]
3. ☐ [Step 3 - third action]
4. ☐ [Step 4 - final action]

Absorption time: [X seconds/minutes]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⏰ WHEN TO USE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
☐ Morning routine
☐ Evening routine  
☐ Both morning & evening
☐ As needed (occasional)

Frequency: [1-2 times daily/once daily/X times per week]

Order in routine:
Apply this [1st/2nd/3rd/etc] in your routine
After: [previous product]
Before: [next product]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 PRO TIPS & TECHNIQUES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Tip 1: [Application technique tip]
• Tip 2: [Absorption enhancement]
• Tip 3: [Common mistake to avoid]
• Tip 4: [Best results hack]

Layering hack: [How to layer with other products]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ WHAT TO AVOID
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✗ Don't mix with: [Incompatible ingredients]
✗ Avoid using if: [Skin conditions to be careful with]
✗ Common mistakes: [List of what not to do]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔄 EXPECTED TIMELINE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Week 1-2: [What to expect initially]
Week 3-4: [Adaptation phase results]
Month 2+: [Long-term results]

⏱️ INTERACTIVE CHECKLIST - [PRODUCT NAME]
─────────────────────────────────────────
☐ Today applied
☐ Morning or Evening: [selector]
⏱️ Timer: [optional timer for absorption]
📝 Notes: [user notes field]

Display links: 📖 Read full guide | ⚙️ Adjust frequency | 💬 Ask questions
```

---

### PROMPT 6️⃣: Perawatan Lanjutan - Advanced Care Plan
```
🎯 ADVANCED SKINCARE PLAN - After 4 Weeks

You've completed your basic routine for [4 weeks]. 
Time to introduce advanced treatments!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 YOUR SKIN PROGRESS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Original concerns: [List original concerns]
Current status: [Assessment]
Improvements: [What's better]
Remaining concerns: [What still needs work]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔬 RECOMMENDED ADVANCED TREATMENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

WEEKLY TREATMENTS (1x per week):
└─ Treatment type: [Exfoliating/Hydrating/Purifying]
   Product: [Name]
   Frequency: Once weekly
   Best day: [Wednesday/Friday]
   Time: [Duration]
   Expected results: [What to expect]

MONTHLY INTENSIVE CARE (1x per month):
└─ Treatment type: [Deep cleanse/Hydration boost]
   Product: [Name]
   How often: Once monthly
   Application: [How to do it]
   Downtime: [If any]
   Results: [Expected outcome]

TARGETED CONCERNS TREATMENTS:
For [CONCERN 1]:
├─ Product recommendation: [Name]
├─ How often: [Frequency]
├─ Application: [Technique]
└─ Timeline to see results: [Duration]

For [CONCERN 2]:
├─ Product recommendation: [Name]
├─ How often: [Frequency]
├─ Application: [Technique]
└─ Timeline to see results: [Duration]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌍 SEASONAL ADJUSTMENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Summer adjustments: [Changes needed]
Winter adjustments: [Changes needed]
Humidity impact: [Product adjustments]
Temperature sensitivity: [Modifications]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💪 LIFESTYLE FACTORS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Sleep optimization: [Recommendations]
Diet for skin health: [Foods to eat/avoid]
Stress management: [Techniques]
Sun protection beyond SPF: [Additional tips]
Hydration goals: [Water intake]
Exercise benefits: [How it helps skin]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔄 UPDATED ROUTINE STRUCTURE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Morning routine:
☐ [Updated steps with new products if needed]

Evening routine:
☐ [Updated steps with new products if needed]

Weekly special day:
☐ [Weekly treatment protocol]

Monthly treatment:
☐ [Monthly intensive protocol]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📈 EXPECTED RESULTS TIMELINE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Week 1-2: [Immediate changes]
Week 3-4: [Visible improvements]
Month 2-3: [Significant transformation]
Month 4+: [Long-term maintenance]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 PROGRESS TRACKING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
☐ Take weekly photos
☐ Journal skin condition
☐ Track product usage
☐ Note environmental factors
☐ Review progress monthly

Display options:
📸 Photo progress tracker
📋 Detailed checklist
💭 How I'm feeling
🎯 Update skin goals

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
❓ TROUBLESHOOTING GUIDE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
If breakout occurs: [What to do]
If irritation develops: [Solutions]
If no visible progress: [Troubleshoot]
If overexfoliating: [How to recover]

Display: 💬 Ask for help | 🔄 Adjust routine | 📞 Professional advice

```

---

## COMPLETE JOURNEY INTERACTIVE FLOW

```
START
  ↓
📸 Face Analysis (AI detects skin profile)
  ↓
✓ Skin Profile Created (Show card with findings)
  ↓
📋 Choose Program (Essential/Advanced/Intensive)
  ↓
🛍️ View Product Recommendations (List with alternatives)
  ↓
✅ Confirm Product Selection
  ↓
📝 Daily Routine Structure (To-do with steps)
  ↓
🎯 Per-Product Detailed Instructions (How to apply each)
  ↓
✔️ Start Routine (Begin 4-week journey)
  ↓
📊 Track Progress (Daily checklist)
  ↓
⏰ Week 4 Checkpoint (Assess improvements)
  ↓
🔬 Advanced Care Plan (Introduce treatments)
  ↓
🌍 Seasonal Adjustments (As needed)
  ↓
♾️ Long-term Maintenance (Ongoing routine)
```

---

## KEY FEATURES TO IMPLEMENT

### For Each Step:
1. ✅ Clear visual hierarchy
2. ✅ Interactive checklist elements
3. ✅ Progress indicators
4. ✅ Timer functionalities (for application)
5. ✅ Expandable product details
6. ✅ Photo/before-after comparison
7. ✅ Notifications/reminders
8. ✅ Notes/journal feature
9. ✅ Alternative suggestions
10. ✅ Q&A/help sections

---

## MOBILE-FIRST DESIGN NOTES
- Card-based layout
- Swipeable product carousel
- Large touch targets for checkboxes
- Vertical scrolling (minimal horizontal)
- Sticky routine header
- Quick-access timer
- Simple icons + clear labels

---

## INTEGRATION POINTS
- AI face detection API
- Product database
- User progress tracking
- Reminder notifications
- Photo library (before/afters)
- Social sharing (optional)
- Community feedback (optional)

---

**Total Flow Time:** 
- Complete setup: 10-15 minutes
- Daily routine: 5-10 minutes
- Weekly review: 5 minutes
- Monthly assessment: 10 minutes

**Expected First Results:** 2-4 weeks
**Optimal Results:** 8-12 weeks