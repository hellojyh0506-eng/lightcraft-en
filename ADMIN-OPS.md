# 🔧 一键成片 · 老板运营指南

> 客户微信私聊你说要订阅/退费/查积分？打开终端，`cd` 到项目目录，复制下面的命令改改就行。
>
> **所有命令都在项目根目录执行**：`cd ~/Desktop/study/lightcraft-v2`

---

## 📋 会员套餐速查

| 套餐 | ID | 月费 | 月积分 | 可用功能 |
|------|-----|------|--------|---------|
| 免费 | `starter` | ¥0 | 签到 3/天 | 标准版视频 |
| 试用 | `trial` | ¥0 (7天) | 注册送 50 | 标准版视频 |
| Pro | `pro` | ¥49 | 400 | + 声画版 + 转场 |
| Max | `max` | ¥99 | 900 | + 批量处理 |
| Ultra | `ultra` | ¥249 | 1500 | + 臻品1080P + 15秒 + 优先队列 |

---

## 🔍 1. 查用户信息

```bash
# 用邮箱查
sqlite3 dev.db "SELECT id, email, phone, name, membership, credits, trialEndsAt, createdAt FROM User WHERE email='客户邮箱';"

# 用手机号查
sqlite3 dev.db "SELECT id, email, phone, name, membership, credits, trialEndsAt, createdAt FROM User WHERE phone='13812345678';"

# 查所有用户（概览）
sqlite3 dev.db "SELECT email, phone, membership, credits, createdAt FROM User ORDER BY createdAt DESC;"

# 查用户总数
sqlite3 dev.db "SELECT count(*) as 总用户数 FROM User;"

# 按会员类型统计
sqlite3 dev.db "SELECT membership as 会员类型, count(*) as 人数 FROM User GROUP BY membership;"
```

---

## ⬆️ 2. 开通/升级会员

客户付完钱，跑这个命令。**三步走：改会员 → 加积分 → 记流水**

```bash
# === 开通 Pro 会员（¥49，400 积分）===
sqlite3 dev.db "
UPDATE User SET membership='pro', credits=credits+400 WHERE email='客户邮箱';
INSERT INTO CreditTransaction(id, userId, amount, type, reason, createdAt)
SELECT lower(hex(randomblob(12))), id, 400, 'purchase', '开通 Pro 会员', datetime('now')
FROM User WHERE email='客户邮箱';
"

# === 开通 Max 会员（¥99，900 积分）===
sqlite3 dev.db "
UPDATE User SET membership='max', credits=credits+900 WHERE email='客户邮箱';
INSERT INTO CreditTransaction(id, userId, amount, type, reason, createdAt)
SELECT lower(hex(randomblob(12))), id, 900, 'purchase', '开通 Max 会员', datetime('now')
FROM User WHERE email='客户邮箱';
"

# === 开通 Ultra 会员（¥249，1500 积分）===
sqlite3 dev.db "
UPDATE User SET membership='ultra', credits=credits+1500 WHERE email='客户邮箱';
INSERT INTO CreditTransaction(id, userId, amount, type, reason, createdAt)
SELECT lower(hex(randomblob(12))), id, 1500, 'purchase', '开通 Ultra 会员', datetime('now')
FROM User WHERE email='客户邮箱';
"
```

> 💡 客户只需要**刷新页面**或**切回标签页**就能看到新会员状态（已加 visibilitychange 自动刷新）

---

## 🔄 3. 续费（已有会员，再加一个月积分）

```bash
# Pro 续费（+400 积分，不改会员等级）
sqlite3 dev.db "
UPDATE User SET credits=credits+400 WHERE email='客户邮箱';
INSERT INTO CreditTransaction(id, userId, amount, type, reason, createdAt)
SELECT lower(hex(randomblob(12))), id, 400, 'renewal', 'Pro 会员续费', datetime('now')
FROM User WHERE email='客户邮箱';
"

# Max 续费（+900）
sqlite3 dev.db "
UPDATE User SET credits=credits+900 WHERE email='客户邮箱';
INSERT INTO CreditTransaction(id, userId, amount, type, reason, createdAt)
SELECT lower(hex(randomblob(12))), id, 900, 'renewal', 'Max 会员续费', datetime('now')
FROM User WHERE email='客户邮箱';
"

# Ultra 续费（+1500）
sqlite3 dev.db "
UPDATE User SET credits=credits+1500 WHERE email='客户邮箱';
INSERT INTO CreditTransaction(id, userId, amount, type, reason, createdAt)
SELECT lower(hex(randomblob(12))), id, 1500, 'renewal', 'Ultra 会员续费', datetime('now')
FROM User WHERE email='客户邮箱';
"
```

---

## ⬇️ 4. 降级/取消会员

```bash
# 降级到免费用户（积分保留，不退）
sqlite3 dev.db "UPDATE User SET membership='starter' WHERE email='客户邮箱';"

# 降级到 Pro（从 Max/Ultra 降）
sqlite3 dev.db "UPDATE User SET membership='pro' WHERE email='客户邮箱';"
```

---

## 💰 5. 退费

```bash
# 查客户当前积分
sqlite3 dev.db "SELECT email, membership, credits FROM User WHERE email='客户邮箱';"

# 全额退费：清积分 + 降级到 starter + 记退费流水
sqlite3 dev.db "
INSERT INTO CreditTransaction(id, userId, amount, type, reason, createdAt)
SELECT lower(hex(randomblob(12))), id, -credits, 'refund', '全额退费', datetime('now')
FROM User WHERE email='客户邮箱';
UPDATE User SET membership='starter', credits=0 WHERE email='客户邮箱';
"

# 部分退费（退 200 积分）
sqlite3 dev.db "
UPDATE User SET credits=credits-200 WHERE email='客户邮箱' AND credits>=200;
INSERT INTO CreditTransaction(id, userId, amount, type, reason, createdAt)
SELECT lower(hex(randomblob(12))), id, -200, 'refund', '部分退费 200 积分', datetime('now')
FROM User WHERE email='客户邮箱';
"
```

---

## 🎁 6. 手动送积分（赠品/补偿/活动）

```bash
# 送 50 积分
sqlite3 dev.db "
UPDATE User SET credits=credits+50 WHERE email='客户邮箱';
INSERT INTO CreditTransaction(id, userId, amount, type, reason, createdAt)
SELECT lower(hex(randomblob(12))), id, 50, 'grant', '客服补偿/活动赠送', datetime('now')
FROM User WHERE email='客户邮箱';
"

# 送 100 积分（改数字就行）
sqlite3 dev.db "
UPDATE User SET credits=credits+100 WHERE email='客户邮箱';
INSERT INTO CreditTransaction(id, userId, amount, type, reason, createdAt)
SELECT lower(hex(randomblob(12))), id, 100, 'grant', '新用户体验赠送', datetime('now')
FROM User WHERE email='客户邮箱';
"
```

---

## 📊 7. 查积分流水

```bash
# 查某客户的积分变动记录
sqlite3 dev.db "
SELECT ct.amount, ct.type, ct.reason, ct.createdAt
FROM CreditTransaction ct
JOIN User u ON ct.userId = u.id
WHERE u.email='客户邮箱'
ORDER BY ct.createdAt DESC
LIMIT 20;
"

# 查最近所有充值记录
sqlite3 dev.db "
SELECT u.email, ct.amount, ct.type, ct.reason, ct.createdAt
FROM CreditTransaction ct
JOIN User u ON ct.userId = u.id
WHERE ct.type IN ('purchase', 'renewal')
ORDER BY ct.createdAt DESC
LIMIT 20;
"
```

---

## 📈 8. 经营数据看板

```bash
# 今日新注册
sqlite3 dev.db "SELECT count(*) as 今日注册 FROM User WHERE date(createdAt)=date('now');"

# 本月注册
sqlite3 dev.db "SELECT count(*) as 本月注册 FROM User WHERE strftime('%Y-%m',createdAt)=strftime('%Y-%m','now');"

# 今日生成量（图片+视频）
sqlite3 dev.db "SELECT type, count(*) as 数量 FROM Generation WHERE date(createdAt)=date('now') GROUP BY type;"

# 今日积分消耗
sqlite3 dev.db "SELECT sum(creditsUsed) as 今日消耗积分 FROM Generation WHERE date(createdAt)=date('now') AND status='completed';"

# 付费用户数
sqlite3 dev.db "SELECT count(*) as 付费用户 FROM User WHERE membership IN ('pro','max','ultra');"

# 积分余额排行（找大客户）
sqlite3 dev.db "SELECT email, membership, credits FROM User ORDER BY credits DESC LIMIT 10;"
```

---

## 🛠️ 9. 问题排查

```bash
# 查客户最近的生成记录（看有没有失败）
sqlite3 dev.db "
SELECT g.type, g.status, g.creditsUsed, g.errorMsg, g.createdAt
FROM Generation g
JOIN User u ON g.userId = u.id
WHERE u.email='客户邮箱'
ORDER BY g.createdAt DESC
LIMIT 10;
"

# 查失败的生成（需要退积分的）
sqlite3 dev.db "
SELECT u.email, g.type, g.creditsUsed, g.errorMsg, g.createdAt
FROM Generation g
JOIN User u ON g.userId = u.id
WHERE g.status='failed'
ORDER BY g.createdAt DESC
LIMIT 20;
"

# 延长试用期（再加 7 天）
sqlite3 dev.db "
UPDATE User SET trialEndsAt=datetime(trialEndsAt, '+7 days')
WHERE email='客户邮箱' AND membership='trial';
"
```

---

## ⚠️ 注意事项

1. **所有命令在项目根目录执行**：`cd ~/Desktop/study/lightcraft-v2`
2. **改完客户刷新页面即生效**（已内置 visibilitychange 自动刷新）
3. **`客户邮箱` 要替换成真实邮箱**，带引号
4. **退费前先截图客户积分**，留证据
5. **数据库文件是 `dev.db`**，上线后改成生产数据库路径
6. **记得备份**：`cp dev.db dev.db.bak` 操作前备一份
