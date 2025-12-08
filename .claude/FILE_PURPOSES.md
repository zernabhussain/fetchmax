# FetchMax File Purposes - Quick Reference

**Last Updated:** 2025-12-06

This document explains what each .md file is for and when the orchestrator updates it.

---

## 📋 Root Documentation Files (User-Facing Only)

### ✅ Published with npm Package

#### 1. **README.md**
**Location:** Root
**Purpose:** Main project documentation for users
**Updated When:** New features, API changes, test counts change, plugins added
**Orchestrator Uses:** User-facing documentation

#### 2. **CHANGELOG.md**
**Location:** Root
**Purpose:** Version history and release notes
**Updated When:** Releases, significant features, breaking changes
**Orchestrator Uses:** Tracks version changes

#### 3. **CONTRIBUTING.md**
**Location:** Root
**Purpose:** Contributor guide (open source standard)
**Updated When:** Development process changes
**Orchestrator Uses:** Reference for contribution workflows

#### 4. **CODE_OF_CONDUCT.md**
**Location:** Root
**Purpose:** Community guidelines (open source standard)
**Updated When:** Rarely - only if community policies change
**Orchestrator Uses:** Reference only

---

## 📁 Development Context Files (.claude/context/)

### ✅ Auto-Updated by Orchestrator (Not Published)

#### 1. **REMAINING WORK.md**
**Location:** .claude/context/
**Purpose:** Current project status and task list
**Updated When:** After any task completion, status change, or new task added
**Orchestrator Uses:** Primary status source - reads to answer "what's remaining?"

#### 2. **TEST_SUMMARY.md**
**Location:** .claude/context/
**Purpose:** Current test status, counts, and failures
**Updated When:** After running tests, adding tests, fixing tests
**Orchestrator Uses:** Reads to report test status

#### 3. **CLAUDE.md**
**Location:** .claude/context/
**Purpose:** Development history, bug fixes, sprint notes
**Updated When:** After fixing bugs, completing sprints, architectural changes
**Orchestrator Uses:** Logs fixes and development history

#### 4. **PROJECT_STATUS.md**
**Location:** .claude/context/
**Purpose:** Overall project health, metrics, status
**Updated When:** Major milestones, sprints complete, significant changes
**Orchestrator Uses:** High-level status reporting

#### 5. **TEST_PLAN.md**
**Location:** .claude/context/
**Purpose:** Test strategy, organization, coverage goals
**Updated When:** Test strategy changes, new test types added
**Orchestrator Uses:** Reference for testing approach

#### 6. **PERFORMANCE_SUMMARY.md**
**Location:** .claude/context/
**Purpose:** Verified bundle sizes and performance metrics
**Updated When:** After benchmarks run, performance verification
**Orchestrator Uses:** Reference for performance claims

#### 7. **AUTOMATION_GUIDE.md**
**Location:** .claude/context/
**Purpose:** User guide for automation system
**Updated When:** Automation capabilities change
**Orchestrator Uses:** Reference for users

---

## 📁 .claude/ Directory Files

### Internal System Files (You Never Need to Touch)

#### **ORCHESTRATOR.md**
**Purpose:** Master orchestrator instructions (my brain!)
**Updated When:** Automation capabilities enhanced
**Who Reads:** Claude AI in every new session

#### **PLAYWRIGHT_SETUP.md**
**Purpose:** E2E testing setup guide
**Updated When:** E2E testing approach changes
**Who Reads:** Orchestrator when setting up Playwright

#### **README.md**
**Purpose:** Quick start for the automation system
**Updated When:** System changes
**Who Reads:** Users/developers learning the system

#### **FILE_PURPOSES.md** (this file)
**Purpose:** Explains what each file does
**Updated When:** File structure changes
**Who Reads:** Users asking "what's this file for?"

---

## 🔄 Update Workflow

### Example: User Says "Fix Rate-Limit Tests"

**Orchestrator Automatically Updates:**
1. ✅ **.claude/context/REMAINING WORK.md** - Marks task complete
2. ✅ **.claude/context/TEST_SUMMARY.md** - Updates test counts (e.g., 288/288 passing)
3. ✅ **.claude/context/CLAUDE.md** - Logs the fix with details
4. ✅ **README.md** - Updates test badge if needed (root, user-facing)

**User Does:** Nothing! All automatic.

---

### Example: User Says "Add Offline Queue Plugin"

**Orchestrator Automatically Updates:**
1. ✅ **README.md** - Adds plugin to features list
2. ✅ **CHANGELOG.md** - Logs new feature
3. ✅ **TEST_SUMMARY.md** - Updates test counts
4. ✅ **PROJECT_STATUS.md** - Updates plugin count
5. ✅ **REMAINING WORK.md** - Marks task complete

**User Does:** Nothing! All automatic.

---

## 📊 File Update Frequency

### Every Task (High Frequency)
- REMAINING WORK.md - Every task status change
- TEST_SUMMARY.md - After every test run
- CLAUDE.md - After every significant fix/change

### Features/Releases (Medium Frequency)
- README.md - When user-facing changes happen
- CHANGELOG.md - When releasing or major features
- PROJECT_STATUS.md - Milestones and sprints

### Rarely (Low Frequency)
- TEST_PLAN.md - Strategy changes
- CONTRIBUTING.md - Process changes
- CODE_OF_CONDUCT.md - Policy changes
- AUTOMATION_GUIDE.md - System changes

---

## 🎯 Quick Answer Guide

**Q: Which file shows current status?**
A: `.claude/context/REMAINING WORK.md`

**Q: Which file shows test results?**
A: `.claude/context/TEST_SUMMARY.md`

**Q: Which file has bug fix history?**
A: `.claude/context/CLAUDE.md`

**Q: Which file is for end users?**
A: `README.md` (root)

**Q: Which file shows version changes?**
A: `CHANGELOG.md` (root)

**Q: Which file do I edit?**
A: **NONE!** Orchestrator updates them all automatically.

---

## ✅ What You Should Know

### Files You'll Read:
- ✅ **AUTOMATION_GUIDE.md** - Learn how to use the system
- ✅ **REMAINING WORK.md** - Check current status
- ✅ **README.md** - Project documentation

### Files Orchestrator Manages:
- 🤖 Everything else updates automatically
- 🤖 You never manually edit them
- 🤖 Always current and accurate

### Files That Got Removed (Old):
- ❌ REMAINING_TODO.md - Old duplicate
- ❌ REMAINING_WORK.md (no space) - Old duplicate
- ❌ fix-*.cjs files - Old debugging scripts
- ❌ test-*.js files - Old test scripts

---

## 🎓 Remember

**The Golden Rule:**
> You talk, orchestrator does everything, files update automatically.

**You Never Need To:**
- ❌ Manually update any .md files
- ❌ Remember which file to update
- ❌ Keep documentation in sync
- ❌ Track test counts
- ❌ Update changelogs

**Orchestrator Always:**
- ✅ Updates all relevant files
- ✅ Keeps everything in sync
- ✅ Maintains accurate counts
- ✅ Logs all changes
- ✅ Reports what it did

---

**Simple, right? That's the whole point!** 🚀
