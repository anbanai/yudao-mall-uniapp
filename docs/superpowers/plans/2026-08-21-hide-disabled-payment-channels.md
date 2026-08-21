# 隐藏未开启支付渠道 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让收银台只展示当前平台支持且后端已开启的支付渠道。

**Architecture:** 保留 `getPayMethods(channels)` 现有的平台与渠道编码映射，只在返回前过滤 `disabled` 项。收银台页面继续消费返回数组并自动选择首个可用项，支付调用接口不变。

**Tech Stack:** Vue 3、Uni-app、JavaScript、Node.js 原生断言脚本、Uni-app H5 构建。

---

### Task 1: Add a failing regression check for channel filtering

**Files:**
- Create: `scripts/test-pay-methods.mjs`

- [x] **Step 1: Write the failing test**

  Import `getPayMethods`, set the platform to a supported platform, and assert that an enabled channel is returned while an unavailable channel is absent. Also assert that an empty backend channel list returns an empty array.

- [x] **Step 2: Run the test to verify it fails**

  Run: `node scripts/test-pay-methods.mjs`
  Expected: FAIL because `getPayMethods` currently returns disabled payment method entries.

### Task 2: Filter disabled methods at the shared mapping boundary

**Files:**
- Modify: `sheep/platform/pay.js:307-358`

- [x] **Step 1: Implement the minimal filter**

  Keep the existing method definitions and platform checks, then return `payMethods.filter((item) => !item.disabled)` after all checks have completed.

- [x] **Step 2: Run the regression check**

  Run: `node scripts/test-pay-methods.mjs`
  Expected: PASS for enabled-only, platform-specific, and empty-channel cases.

### Task 3: Verify the application build and diff

**Files:**
- Verify: `sheep/platform/pay.js`, `scripts/test-pay-methods.mjs`

- [x] **Step 1: Run formatting/diff checks**

  Run: `git diff --check` and inspect the targeted diff to confirm no unrelated files changed.

- [x] **Step 2: Run the H5 build**

  Run: `npm run build:h5`
  Expected: Uni-app H5 build exits successfully.

- [x] **Step 3: Record the completed verification**

  Report the regression check and build results, and note any pre-existing unrelated worktree changes without modifying them.
