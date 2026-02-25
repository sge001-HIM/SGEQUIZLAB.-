# SGEQUIZLAB — Setup Guide

## Files
- index.html — Landing page
- admin.html — Admin dashboard (login required)
- quiz.html  — Student quiz page (/quiz.html?id=QUIZ_ID)
- leaderboard.html — Rankings (/leaderboard.html?id=QUIZ_ID)
- firebase.js — Firebase config (already has your credentials)
- firebase.json — Hosting config
- firestore.rules — Security rules
- firestore.indexes.json — Composite indexes

## Step 1 — Enable Firebase Services

### Authentication
Firebase Console → Authentication → Get started → Enable Email/Password
Then: Add user → your admin email + password

### Firestore
Firebase Console → Firestore Database → Create database → Production mode

## Step 2 — Deploy

```bash
npm install -g firebase-tools
firebase login
firebase init   # select Hosting + Firestore, use existing project "sgequizlab"
firebase deploy
```

## Step 3 — Create First Quiz

Go to yoursite.web.app/admin.html, sign in, paste MCQ:

```
What is the capital of France?
A. London
B. Paris
C. Berlin
D. Rome
Answer: B
Explanation: Paris is the capital of France.
```

Separate multiple questions with a blank line.

## MCQ Format Rules
- Line 1: Question text
- Lines 2-5: A. Option / B. Option / C. Option / D. Option
- Line 6: Answer: B  (A B C or D)
- Line 7: Explanation: text  (optional)
- Blank line between questions
