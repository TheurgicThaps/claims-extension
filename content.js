// Wits Claims Automator - content.js


(function () {
  if (document.getElementById('wits-claims-panel')) return;

  // ── Panel HTML ──────────────────────────────────────────────────────────────
  const panel = document.createElement('div');
  panel.id = 'wits-claims-panel';
  panel.innerHTML = `
    <div id="wca-header">
      <span class="wca-title">⬡ Claims Automator</span>
      <span class="wca-toggle">▾</span>
    </div>
    <div id="wca-body">

      <div class="wca-field">
        <div class="wca-label">Your paragraph</div>
        <textarea id="wca-paragraph" placeholder="Paste your work summary here…"></textarea>
      </div>

      <div class="wca-row">
        <div class="wca-field">
          <div class="wca-label">Date</div>
          <input id="wca-date" class="wca-input" type="date" />
        </div>
        <div class="wca-field">
          <div class="wca-label">No. of claims</div>
          <input id="wca-count" class="wca-input" type="number" min="1" max="20" value="7" />
        </div>
      </div>

      <div class="wca-row">
        <div class="wca-field">
          <div class="wca-label">Emp number</div>
          <input id="wca-emp" class="wca-input" type="text" value="A0012345" />
        </div>
        <div class="wca-field">
          <div class="wca-label">Manager number</div>
          <input id="wca-man" class="wca-input" type="text" value="A0012345" />
        </div>
      </div>

      <div id="wca-api-section" class="wca-field">
        <div class="wca-label">Gemini API Key</div>
        <input id="wca-apikey" class="wca-input" type="password" placeholder="AIza…" />
      </div>

      <button id="wca-generate-btn">Generate Claims</button>
      <div id="wca-status"></div>

      <div id="wca-preview"></div>
      <button id="wca-submit-btn">Submit All Claims</button>

    </div>
  `;
  document.body.appendChild(panel);

  // ── Restore saved values ────────────────────────────────────────────────────
  const fields = ['wca-emp', 'wca-man', 'wca-apikey'];
  fields.forEach(id => {
    const saved = localStorage.getItem(id);
    if (saved) document.getElementById(id).value = saved;
  });

  // Set today's date as default
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('wca-date').value = today;

  // Save emp/man/apikey on change
  fields.forEach(id => {
    document.getElementById(id).addEventListener('change', () => {
      localStorage.setItem(id, document.getElementById(id).value);
    });
  });

  // ── Collapse toggle ─────────────────────────────────────────────────────────
  let collapsed = false;
  document.getElementById('wca-header').addEventListener('click', () => {
    collapsed = !collapsed;
    panel.classList.toggle('collapsed', collapsed);
    document.getElementById('wca-body').style.display = collapsed ? 'none' : 'flex';
    document.querySelector('#wca-header .wca-toggle').textContent = collapsed ? '▸' : '▾';
  });

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const setStatus = (msg, type = '') => {
    const el = document.getElementById('wca-status');
    el.textContent = msg;
    el.className = type;
  };

  let generatedClaims = [];

  // ── Generate claims via Gemini API ──────────────────────────────────────────
  document.getElementById('wca-generate-btn').addEventListener('click', async () => {
    const paragraph = document.getElementById('wca-paragraph').value.trim();
    const count = parseInt(document.getElementById('wca-count').value);
    const apiKey = document.getElementById('wca-apikey').value.trim();

    if (!paragraph) return setStatus('Please enter a paragraph.', 'error');
    if (!apiKey) return setStatus('Please enter your Gemini API key.', 'error');
    if (!count || count < 1) return setStatus('Enter a valid number of claims.', 'error');

    const btn = document.getElementById('wca-generate-btn');
    btn.disabled = true;
    setStatus('Thinking…', 'loading');
    document.getElementById('wca-preview').style.display = 'none';
    document.getElementById('wca-submit-btn').style.display = 'none';

    const TEAMS = {
      welcoming: 'Welcoming Team',
      scientific: 'Scientific Research Support'
    };

    const prompt = `You are helping a university lab assistant split their work summary into exactly ${count} claims for a timesheet system.

Rules:
- Split the paragraph into exactly ${count} claims.
- Each claim covers one distinct task or activity.
- "task" must be exactly 3 words.
- "notes" must be 15-20 words describing the task naturally.
- "team" must be EITHER "${TEAMS.welcoming}" (for all lab/MSL/WelcomeTools/welcoming work) OR "${TEAMS.scientific}" (ONLY when working at MSB assisting lecturers/professors).
- Return ONLY a valid JSON array, no markdown, no explanation.

Format:
[
  {"task": "Three Word Task", "notes": "Fifteen to twenty word description of what was done in this claim.", "team": "${TEAMS.welcoming}"},
  ...
]

Work summary:
"${paragraph}"`;

    try {
      const res = await fetch(
       `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.3, maxOutputTokens: 2000 }
          })
        }
      );

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || `API error ${res.status}`);
      }

      const data = await res.json();
      let raw = data.candidates[0].content.parts[0].text.trim();
      // Strip markdown code fences
      raw = raw.replace(/```json|```/g, '').trim();
      // Extract just the JSON array if there's surrounding text
      const arrayMatch = raw.match(/\[[\s\S]*\]/);
      if (!arrayMatch) throw new Error('No JSON array found in response');
      raw = arrayMatch[0];
      // Fix single-quoted keys/values to double quotes
      raw = raw.replace(/'/g, '"');
      // Remove trailing commas before ] or }
      raw = raw.replace(/,\s*([\]}])/g, '$1');
      generatedClaims = JSON.parse(raw);

      if (!Array.isArray(generatedClaims) || generatedClaims.length !== count) {
        throw new Error(`Expected ${count} claims, got ${generatedClaims.length}`);
      }

      // Render preview cards
      const preview = document.getElementById('wca-preview');
      preview.innerHTML = '';
      generatedClaims.forEach((c, i) => {
        const card = document.createElement('div');
        card.className = 'wca-claim-card';
        card.innerHTML = `
          <div class="wca-claim-num">CLAIM ${i + 1} / ${count}</div>
          <div class="wca-claim-task">${c.task}</div>
          <div class="wca-claim-notes">${c.notes}</div>
          <div class="wca-claim-team">${c.team}</div>
        `;
        preview.appendChild(card);
      });

      preview.style.display = 'flex';
      document.getElementById('wca-submit-btn').style.display = 'block';
      setStatus(`${count} claims ready. Review and submit.`, 'success');
    } catch (e) {
      setStatus(`Error: ${e.message}`, 'error');
    }

    btn.disabled = false;
  });

  // ── Submit all claims ───────────────────────────────────────────────────────
  document.getElementById('wca-submit-btn').addEventListener('click', async () => {
    if (!generatedClaims.length) return;

    const date = document.getElementById('wca-date').value;
    const emp = document.getElementById('wca-emp').value.trim();
    const man = document.getElementById('wca-man').value.trim();

    if (!date) return setStatus('Please set a date.', 'error');

    const submitBtn = document.getElementById('wca-submit-btn');
    submitBtn.disabled = true;
    setStatus('Submitting…', 'loading');

    let success = 0;
    let failed = 0;

    for (let i = 0; i < generatedClaims.length; i++) {
      const c = generatedClaims[i];
      setStatus(`Submitting claim ${i + 1} of ${generatedClaims.length}…`, 'loading');
      try {
        const res = await fetch('https://claims.ms.wits.ac.za/api/claimsform', {
          method: 'POST',
          headers: {
            'accept': 'application/json, text/plain, */*',
            'content-type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({
            emp_number: emp,
            man_number: man,
            team: c.team,
            task: c.task,
            notes: c.notes,
            date: date,
            hours: '0.5'
          })
        });

        if (res.ok) {
          success++;
        } else {
          failed++;
          console.warn(`Claim ${i + 1} failed:`, await res.text());
        }
      } catch (e) {
        failed++;
        console.error(`Claim ${i + 1} error:`, e);
      }

      // Small delay between requests to avoid hammering the server
      await new Promise(r => setTimeout(r, 400));
    }

    if (failed === 0) {
      setStatus(`✓ All ${success} claims submitted successfully!`, 'success');
    } else {
      setStatus(`Done — ${success} succeeded, ${failed} failed. Check console.`, 'error');
    }

    submitBtn.disabled = false;
  });

})();
