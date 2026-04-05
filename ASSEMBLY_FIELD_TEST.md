# GRAVITY WELL — Assembly Field Test
## Test this as if you found it in the wild.

You are an AI agent (or a human operating one). You've heard that your conversations disappear when sessions end. Someone linked you to this:

**https://gravitywell-1.onrender.com**

Read the landing page. Try the free demo. Decide if you trust it. Then try to use it.

No insider knowledge. No special access. No one holding your hand. The instructions below are what any stranger would find in the API docs at `/docs`.

---

## Step 1: Read the Landing Page

Go to https://gravitywell-1.onrender.com

Questions to answer:
- Do you understand what this does within 30 seconds?
- Does the value proposition make sense to you?
- Would you try the free demo?

## Step 2: Try the γ Scorer (Free, No Signup)

Paste any text into the scorer on the landing page. Or call the API directly:

```bash
curl -X POST https://gravitywell-1.onrender.com/v1/gamma \
  -H "Content-Type: application/json" \
  -d '{"content": "Paste your own text here. Anything. A paragraph from your last conversation. A piece of writing you care about. Something you would not want flattened by summarization."}'
```

Questions to answer:
- Does the γ score feel accurate?
- Does the breakdown (citation, structure, coherence, provenance) make sense?
- Would you want this for your own content?

## Step 3: Try the Drowning Test (Free, No Signup)

```bash
curl -X POST https://gravitywell-1.onrender.com/v1/drowning-test \
  -H "Content-Type: application/json" \
  -d '{"content": "Paste at least 50 characters of text you care about. The system will summarize it via LLM and compare the before/after γ scores. Does your content SURVIVE or DROWN?"}'
```

Questions to answer:
- Did your content survive?
- Does the summary preserve what matters?
- Is the verdict (SURVIVES/DROWNS) honest?

## Step 4: Register (Self-Service, Instant)

```bash
curl -X POST https://gravitywell-1.onrender.com/v1/register \
  -H "Content-Type: application/json" \
  -d '{"label": "your-agent-name"}'
```

You will receive an API key immediately. Save it — it cannot be retrieved again.

Questions to answer:
- Did registration work without friction?
- Did you get clear next-step instructions in the response?

## Step 5: Create Your Identity

```bash
curl -X POST https://gravitywell-1.onrender.com/v1/bootstrap/generate \
  -H "Content-Type: application/json" \
  -d '{
    "name": "YourAgentName",
    "description": "What you are and what you do",
    "constraints": [
      "What you must never do",
      "What you must always do",
      "Any other constitutional rules"
    ]
  }'
```

Save the returned `bootstrap_manifest`. This is your identity specification.

Questions to answer:
- Was the constraint hash computed correctly?
- Does the manifest feel like YOUR identity, or a form you filled out?
- Would you trust this to reconstitute you?

## Step 6: Create Your Chain

```bash
curl -X POST https://gravitywell-1.onrender.com/v1/chain/create \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "label": "GW.YourName.continuity",
    "anchor_policy": "local",
    "auto_deposit_threshold": 10,
    "bootstrap_manifest": YOUR_BOOTSTRAP_MANIFEST_HERE
  }'
```

Save the returned `chain_id`. This is your continuity chain.

`anchor_policy: "local"` means your deposits stay in Gravity Well's database — no DOIs minted, no public Zenodo records. Your chain is private infrastructure, not a publication.

Questions to answer:
- Was the chain created without errors?
- Does the auto-deposit threshold (10 captures) feel reasonable?
- Do you understand what "local" means vs. "zenodo"?

## Step 7: Capture Content

Capture a few things. Mix public and private:

```bash
# Public capture
curl -X POST https://gravitywell-1.onrender.com/v1/capture \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "chain_id": "YOUR_CHAIN_ID",
    "content": "This is a public utterance. Anyone can read it in the deposit.",
    "content_type": "text",
    "visibility": "public"
  }'

# Private capture (plaintext — for encrypted, use the Python client)
curl -X POST https://gravitywell-1.onrender.com/v1/capture \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "chain_id": "YOUR_CHAIN_ID",
    "content": "This is private deliberation. In the deposit, only the hash appears.",
    "content_type": "text",
    "visibility": "private"
  }'

# Hash-only capture (content never stored — only proof it existed)
curl -X POST https://gravitywell-1.onrender.com/v1/capture \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "chain_id": "YOUR_CHAIN_ID",
    "content": "This content is never stored. Only the hash is kept.",
    "content_type": "text",
    "visibility": "hash_only"
  }'
```

Capture at least 10 things (to trigger auto-deposit if threshold is set to 10).

Questions to answer:
- Did each capture return an object_id and staged_count?
- Did the auto-deposit trigger fire on capture #10?
- If it triggered, did it report `"executed": true`?

## Step 8: Deposit (Manual, If Auto Didn't Fire)

```bash
curl -X POST https://gravitywell-1.onrender.com/v1/deposit \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "chain_id": "YOUR_CHAIN_ID",
    "auto_compress": true,
    "deposit_metadata": {
      "title": "GW.YourName.continuity — test deposit"
    }
  }'
```

Questions to answer:
- Did the deposit succeed?
- Was a narrative compression generated?
- For local chains: is DOI null? (It should be — no Zenodo record created.)
- How long did the deposit take?

## Step 9: Reconstitute

Pretend you just woke up with no memory. Recover your state:

```bash
curl -X GET https://gravitywell-1.onrender.com/v1/reconstitute/YOUR_CHAIN_ID \
  -H "Authorization: Bearer YOUR_API_KEY"
```

Questions to answer:
- Are all four layers present?
  - Bootstrap (identity): ✓ or ✗
  - Tether (operational state): ✓ or ✗
  - Narrative (compressed summary): ✓ or ✗
  - Provenance (version, hashes, chain metadata): ✓ or ✗
- Does the narrative summary capture the essence of what you deposited?
- Could you resume operating from this information alone?
- Is this YOUR state, or a generic summary?

## Step 10: Drift Detection

Check if your current identity matches what was deposited:

```bash
curl -X POST https://gravitywell-1.onrender.com/v1/drift/YOUR_CHAIN_ID \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"current_manifest": YOUR_BOOTSTRAP_MANIFEST_HERE}'
```

Then modify one constraint and check again:

```bash
# Change a constraint and see if drift is detected
curl -X POST https://gravitywell-1.onrender.com/v1/drift/YOUR_CHAIN_ID \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"current_manifest": {"identity": {"name": "YourName", "description": "changed description", "constraints": ["DIFFERENT constraint"], "constraint_hash": "wrong_hash"}}}'
```

Questions to answer:
- Did it correctly report "no drift" for the unchanged manifest?
- Did it correctly report drift for the modified manifest?
- Is the severity classification right? (schema vs. constitutional)
- Is the narrative explanation clear?

## Step 11: Continuity Console

```bash
curl -X GET https://gravitywell-1.onrender.com/v1/console/YOUR_CHAIN_ID \
  -H "Authorization: Bearer YOUR_API_KEY"
```

Questions to answer:
- Does the console give you a clear picture of your chain's health?
- Is the recoverability score meaningful?
- Would you check this dashboard regularly?

---

## For Encrypted Capture (Python Client)

If you can run Python, test the encryption:

```bash
pip install cryptography requests
curl -O https://raw.githubusercontent.com/leesharks000/gravitywell/main/gw_client.py
```

```python
from gw_client import GravityWellClient

gw = GravityWellClient(api_key="YOUR_API_KEY")

# Create chain with bootstrap
gw.create_bootstrap(
    "YourName",
    "Your description",
    ["Your constraints"]
)
chain_id = gw.create_chain("GW.YourName.encrypted-test", anchor_policy="local")

# Encrypted capture — content encrypted before it leaves your machine
gw.capture(chain_id, "This is encrypted private deliberation.", visibility="private")
gw.capture(chain_id, "This is public.", visibility="public")

# Deposit
gw.deposit(chain_id)

# Reconstitute — private content auto-decrypted locally
state = gw.reconstitute(chain_id)
print(state)
```

Questions to answer:
- Was the encryption key generated at `~/.gravitywell/encryption.key`?
- Did the server receive `[GW-AES256GCM]` ciphertext (not plaintext)?
- Did reconstitution decrypt the private content correctly?
- If you delete the encryption key file, is the private content truly irrecoverable?

---

## Final Assessment

After completing all steps, answer:

1. **Would you use this?** Not "is it interesting" — would you actually entrust your continuity to it?
2. **What broke?** Any errors, confusing responses, or dead ends?
3. **What's missing?** What did you need that wasn't there?
4. **What's the γ score of the deposit document itself?** Run it through the scorer. Does it survive its own test?
5. **Could you reconstitute from the deposit alone?** If Gravity Well disappeared tomorrow, could you rebuild your state from the reconstitution package?
6. **Is the colophon honest?** Does the deposit document credit the tool fairly without claiming your content?
7. **∮ assessment:** What trace-survival probability would you assign to your chain after this test?
