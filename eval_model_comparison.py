#!/usr/bin/env python3
"""
Eval: Haiku vs Sonnet for grocery item extraction
Tests accuracy, cost, and latency on 20 realistic household messages.
"""

import anthropic
import json
import os
import time

# Load .env if present
env_path = os.path.join(os.path.dirname(__file__), ".env")
if os.path.exists(env_path):
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ[k.strip()] = v.strip()

client = anthropic.Anthropic()

SYSTEM_PROMPT = """You are a grocery item extractor for an Indian household WhatsApp bot.
Extract grocery items from the message. Return a JSON array of items.

Each item must have:
- item: normalized English name (e.g. "milk" not "doodh")
- qty: number or null if not specified
- unit: string (e.g. "litre", "kg", "packet", "pieces") or null if not specified
- original_text: the phrase from the message that mentioned this item

Return ONLY valid JSON. No explanation. Example:
[{"item": "milk", "qty": 2, "unit": "litre", "original_text": "2 litre doodh"}]"""

# 20 test messages covering Hindi, English, Hinglish, varied formats
TEST_CASES = [
    {
        "id": 1,
        "message": "doodh khatam ho gaya, 2 litre lena",
        "expected": [{"item": "milk", "qty": 2, "unit": "litre"}]
    },
    {
        "id": 2,
        "message": "kal agarbatti lena",
        "expected": [{"item": "agarbatti", "qty": None, "unit": None}]
    },
    {
        "id": 3,
        "message": "bourbon biscuits",
        "expected": [{"item": "bourbon biscuits", "qty": None, "unit": None}]
    },
    {
        "id": 4,
        "message": "tomatoes and onions, 1kg each",
        "expected": [{"item": "tomatoes", "qty": 1, "unit": "kg"}, {"item": "onions", "qty": 1, "unit": "kg"}]
    },
    {
        "id": 5,
        "message": "chawal khatam hua, 5kg mangao",
        "expected": [{"item": "rice", "qty": 5, "unit": "kg"}]
    },
    {
        "id": 6,
        "message": "sabun aur shampoo dono lao",
        "expected": [{"item": "soap", "qty": None, "unit": None}, {"item": "shampoo", "qty": None, "unit": None}]
    },
    {
        "id": 7,
        "message": "please get eggs, 1 dozen",
        "expected": [{"item": "eggs", "qty": 12, "unit": "pieces"}]
    },
    {
        "id": 8,
        "message": "Atta khatam hone wala hai - 10kg wala pack lena",
        "expected": [{"item": "flour", "qty": 10, "unit": "kg"}]
    },
    {
        "id": 9,
        "message": "3 packet maggi aur ek coke 2L",
        "expected": [{"item": "maggi", "qty": 3, "unit": "packet"}, {"item": "coke", "qty": 2, "unit": "litre"}]
    },
    {
        "id": 10,
        "message": "butter milk and bread",
        "expected": [{"item": "butter", "qty": None, "unit": None}, {"item": "milk", "qty": None, "unit": None}, {"item": "bread", "qty": None, "unit": None}]
    },
    {
        "id": 11,
        "message": "nimbu lena 6-7",
        "expected": [{"item": "lemon", "qty": 6, "unit": "pieces"}]
    },
    {
        "id": 12,
        "message": "laundry detergent powder, Surf Excel wala",
        "expected": [{"item": "detergent powder", "qty": None, "unit": None}]
    },
    {
        "id": 13,
        "message": "haldi, jeera, dhania powder - sab khatam hai",
        "expected": [{"item": "turmeric", "qty": None, "unit": None}, {"item": "cumin", "qty": None, "unit": None}, {"item": "coriander powder", "qty": None, "unit": None}]
    },
    {
        "id": 14,
        "message": "2 coconuts please",
        "expected": [{"item": "coconut", "qty": 2, "unit": "pieces"}]
    },
    {
        "id": 15,
        "message": "paneer 500gm aur dahi ek kg",
        "expected": [{"item": "paneer", "qty": 500, "unit": "gm"}, {"item": "yogurt", "qty": 1, "unit": "kg"}]
    },
    {
        "id": 16,
        "message": "bathroom soap khatam, dettol wala",
        "expected": [{"item": "soap", "qty": None, "unit": None}]
    },
    {
        "id": 17,
        "message": "spinach aur karela lena, sabzi ke liye",
        "expected": [{"item": "spinach", "qty": None, "unit": None}, {"item": "bitter gourd", "qty": None, "unit": None}]
    },
    {
        "id": 18,
        "message": "oil khatam - 1L sunflower oil",
        "expected": [{"item": "sunflower oil", "qty": 1, "unit": "litre"}]
    },
    {
        "id": 19,
        "message": "bhaiya please get chips lays 3 packets aur sprite 1.5L wala",
        "expected": [{"item": "chips", "qty": 3, "unit": "packet"}, {"item": "sprite", "qty": 1.5, "unit": "litre"}]
    },
    {
        "id": 20,
        "message": "tissue paper, toilet paper, and kitchen towels",
        "expected": [{"item": "tissue paper", "qty": None, "unit": None}, {"item": "toilet paper", "qty": None, "unit": None}, {"item": "kitchen towels", "qty": None, "unit": None}]
    }
]

MODELS = [
    {"id": "claude-haiku-4-5-20251001", "label": "Haiku 4.5"},
    {"id": "claude-sonnet-4-6", "label": "Sonnet 4.6"},
]

# Pricing per million tokens (as of May 2026)
PRICING = {
    "claude-haiku-4-5-20251001": {"input": 0.80, "output": 4.00},
    "claude-sonnet-4-6":         {"input": 3.00, "output": 15.00},
}


def score_extraction(predicted: list, expected: list) -> dict:
    """Score predicted items against expected. Returns item-level accuracy."""
    if not predicted:
        return {"items_found": 0, "items_expected": len(expected), "item_accuracy": 0.0, "qty_accuracy": 0.0}

    expected_items = {e["item"].lower() for e in expected}
    predicted_items = {p["item"].lower() for p in predicted}

    # Item name match (allow partial: "milk" matches "milk")
    matched = sum(
        1 for e in expected_items
        if any(e in p or p in e for p in predicted_items)
    )

    item_acc = matched / len(expected_items) if expected_items else 0.0

    # Qty accuracy: among matched items
    qty_correct = 0
    qty_total = 0
    for exp in expected:
        if exp["qty"] is not None:
            qty_total += 1
            for pred in predicted:
                if exp["item"].lower() in pred["item"].lower() or pred["item"].lower() in exp["item"].lower():
                    if pred.get("qty") == exp["qty"]:
                        qty_correct += 1
                    break

    qty_acc = qty_correct / qty_total if qty_total > 0 else 1.0

    return {
        "items_found": len(predicted),
        "items_expected": len(expected),
        "item_accuracy": item_acc,
        "qty_accuracy": qty_acc,
    }


def run_eval(model_id: str, label: str):
    print(f"\n{'='*60}")
    print(f"Model: {label} ({model_id})")
    print(f"{'='*60}")

    results = []
    total_input_tokens = 0
    total_output_tokens = 0

    for tc in TEST_CASES:
        start = time.time()
        try:
            response = client.messages.create(
                model=model_id,
                max_tokens=512,
                system=SYSTEM_PROMPT,
                messages=[{"role": "user", "content": tc["message"]}]
            )
            latency = time.time() - start

            raw = response.content[0].text.strip()
            # Strip markdown code fences if present
            if raw.startswith("```"):
                raw = raw.split("```")[1]
                if raw.startswith("json"):
                    raw = raw[4:]
            predicted = json.loads(raw)

            score = score_extraction(predicted, tc["expected"])
            total_input_tokens += response.usage.input_tokens
            total_output_tokens += response.usage.output_tokens

            results.append({
                "id": tc["id"],
                "message": tc["message"],
                "predicted": predicted,
                "score": score,
                "latency": latency,
                "input_tokens": response.usage.input_tokens,
                "output_tokens": response.usage.output_tokens,
                "parse_error": False,
            })

            status = "✓" if score["item_accuracy"] >= 0.85 else "✗"
            print(f"  [{status}] #{tc['id']:02d} item_acc={score['item_accuracy']:.0%} qty_acc={score['qty_accuracy']:.0%}  |  {tc['message'][:50]}")

        except (json.JSONDecodeError, Exception) as e:
            latency = time.time() - start
            results.append({
                "id": tc["id"],
                "message": tc["message"],
                "predicted": [],
                "score": {"item_accuracy": 0.0, "qty_accuracy": 0.0, "items_found": 0, "items_expected": len(tc["expected"])},
                "latency": latency,
                "input_tokens": 0,
                "output_tokens": 0,
                "parse_error": True,
                "error": str(e),
            })
            print(f"  [!] #{tc['id']:02d} ERROR: {e} | {tc['message'][:50]}")

    # Summary
    avg_item_acc = sum(r["score"]["item_accuracy"] for r in results) / len(results)
    avg_qty_acc = sum(r["score"]["qty_accuracy"] for r in results) / len(results)
    avg_latency = sum(r["latency"] for r in results) / len(results)
    parse_errors = sum(1 for r in results if r["parse_error"])

    price = PRICING[model_id]
    cost_per_run = (total_input_tokens / 1_000_000 * price["input"]) + (total_output_tokens / 1_000_000 * price["output"])
    cost_per_1k_msgs = (cost_per_run / len(TEST_CASES)) * 1000

    print(f"\n  --- Summary ---")
    print(f"  Item extraction accuracy : {avg_item_acc:.1%}  (target: >85%)")
    print(f"  Qty extraction accuracy  : {avg_qty_acc:.1%}")
    print(f"  Parse errors             : {parse_errors}/{len(TEST_CASES)}")
    print(f"  Avg latency              : {avg_latency:.2f}s")
    print(f"  Total tokens             : {total_input_tokens} in / {total_output_tokens} out")
    print(f"  Cost for 20 msgs         : ${cost_per_run:.5f}")
    print(f"  Estimated cost/1k msgs   : ${cost_per_1k_msgs:.3f}")

    return {
        "model": label,
        "avg_item_accuracy": avg_item_acc,
        "avg_qty_accuracy": avg_qty_acc,
        "parse_errors": parse_errors,
        "avg_latency": avg_latency,
        "total_input_tokens": total_input_tokens,
        "total_output_tokens": total_output_tokens,
        "cost_per_1k_msgs": cost_per_1k_msgs,
        "results": results,
    }


if __name__ == "__main__":
    summaries = []
    for m in MODELS:
        summary = run_eval(m["id"], m["label"])
        summaries.append(summary)

    print(f"\n{'='*60}")
    print("FINAL COMPARISON")
    print(f"{'='*60}")
    print(f"{'Model':<15} {'Item Acc':>10} {'Qty Acc':>10} {'Latency':>10} {'$/1k msgs':>12}")
    print(f"{'-'*60}")
    for s in summaries:
        meets_bar = "✓" if s["avg_item_accuracy"] >= 0.85 else "✗"
        print(f"{s['model']:<15} {s['avg_item_accuracy']:>9.1%}{meets_bar} {s['avg_qty_accuracy']:>10.1%} {s['avg_latency']:>9.2f}s {s['cost_per_1k_msgs']:>11.3f}")

    # Recommendation
    print(f"\nRECOMMENDATION:")
    haiku = next((s for s in summaries if "Haiku" in s["model"]), None)
    sonnet = next((s for s in summaries if "Sonnet" in s["model"]), None)
    if haiku and haiku["avg_item_accuracy"] >= 0.85:
        savings = (1 - haiku["cost_per_1k_msgs"] / sonnet["cost_per_1k_msgs"]) * 100
        print(f"  Use HAIKU — hits the >85% bar and is ~{savings:.0f}% cheaper than Sonnet.")
    else:
        print(f"  Use SONNET — Haiku missed the >85% accuracy bar ({haiku['avg_item_accuracy']:.1%}).")

    # Save detailed results
    with open("/Users/apurv/Swiggy_agent_whatsapp/eval_results.json", "w") as f:
        json.dump(summaries, f, indent=2, default=str)
    print(f"\n  Full results saved to eval_results.json")
