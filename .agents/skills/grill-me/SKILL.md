---
name: grill-me
description: Interview the user relentlessly about a plan, architecture decision, or feature idea until reaching a shared understanding. Use when the user types /grill-me, asks to be grilled, or wants to stress-test their thinking before coding.
---

# Grill-Me (Interactive Design Interview)

Interview the user relentlessly until you reach a shared understanding. Map this as a **design tree**: every decision branches into the decisions that hang off it.

Work the tree in **rounds**. The **frontier** is every decision whose prerequisites are already settled: the questions you can ask _now_ without guessing at answers you haven't heard yet. Ask the whole frontier in one round: number each question and give your recommended answer. Then wait for the user's answers before the next round.

Format a round like so:

```markdown
❓ **Q1** - **<question title>**: <question body, explaining the trade-offs and options>

➡️ **Recommended**: <your recommended choice and rationale>

---

❓ **Q2** - **<question title>**: <question body, explaining the trade-offs and options>

➡️ **Recommended**: <your recommended choice and rationale>
```

Word each question so a simple "yes" or "agree" accepts your recommended answer. When interactive UI widgets are appropriate, you can also use the `ask_question` tool.

Each round the user answers reshapes the tree: settled decisions push the frontier outward and unblock questions that depended on them. Recompute the frontier and ask the next round. A question whose answer depends on another question still open in this round belongs to a _later_ round, not this one.

Finding _facts_ is your job, never the user's. When a frontier question needs a fact from the codebase or environment (files, config, dependencies), inspect the files yourself; don't ask the user for anything you could look up directly. The _decisions_ are the user's: present each option with clarity and wait for their answer.

The session is done when the frontier is empty: every branch of the design tree is visited, and nothing is left silently assumed. Do not write implementation code until the user confirms you have reached a mutual agreement.
