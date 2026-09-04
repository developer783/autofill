import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load extension scripts
const utilsCode = fs.readFileSync(path.join(__dirname, '../extension/content/engine/utils.js'), 'utf8');
const heuristicCode = fs.readFileSync(path.join(__dirname, '../extension/content/engine/heuristic.js'), 'utf8');
const greenhouseCode = fs.readFileSync(path.join(__dirname, '../extension/content/adapters/greenhouse.js'), 'utf8');
const leverCode = fs.readFileSync(path.join(__dirname, '../extension/content/adapters/lever.js'), 'utf8');
const workdayCode = fs.readFileSync(path.join(__dirname, '../extension/content/adapters/workday.js'), 'utf8');
const icimsCode = fs.readFileSync(path.join(__dirname, '../extension/content/adapters/icims.js'), 'utf8');

// Sample Profile with full data for verification
const sampleProfile = {
  id: 1,
  profile_slug: 'profile1',
  candidate_display_name: 'Jane Doe',
  details: {
    given_names: 'Jane',
    family_name: 'Doe',
    email_address: 'jane.doe@example.com',
    phone_number: '+1 555-123-4567',
    address_line_1: '123 Market St',
    city: 'San Francisco',
    postal_code: '94105',
    linkedin_url: 'https://linkedin.com/in/janedoe',
    websites: 'https://janedoe.dev',
    gender: 'Female',
    ethnicity: 'Decline to self-identify',
    protected_veteran_status: 'I am not a protected veteran',
    disability_status: 'No, I do not have a disability'
  },
  work_experience: [
    {
      company: 'Tech Corp',
      job_title: 'Senior Software Engineer'
    }
  ],
  files: {
    resume: {
      filename: 'Jane_Doe_Resume.pdf',
      download_url: '/uploads/resume.pdf',
      mimetype: 'application/pdf'
    }
  }
};

function setupDOM(html, url = 'https://example.com') {
  const dom = new JSDOM(html, {
    url,
    runScripts: 'dangerously',
    resources: 'usable'
  });
  const { window } = dom;

  // Polyfill fetch and DataTransfer for file blob downloading in test env
  window.fetch = async () => ({
    ok: true,
    blob: async () => new window.Blob(['dummy content'], { type: 'application/pdf' })
  });

  window.DataTransfer = class DataTransfer {
    constructor() {
      this.items = { add: () => {} };
      this.files = [new window.File(['dummy'], 'resume.pdf')];
    }
  };

  // Execute extension scripts inside window scope
  window.eval(utilsCode);
  window.eval(heuristicCode);
  window.eval(greenhouseCode);
  window.eval(leverCode);
  window.eval(workdayCode);
  window.eval(icimsCode);

  return dom;
}

async function runTests() {
  console.log('====================================================');
  console.log('  ATS AUTOFILL ENGINE ACCURACY & REGRESSION TEST');
  console.log('====================================================\n');

  let results = {};

  // ----------------------------------------------------
  // TEST 1: LEVER ATS
  // ----------------------------------------------------
  {
    const leverHtml = `
      <!DOCTYPE html>
      <html>
      <body class="application-page">
        <form action="https://jobs.lever.co/example/123" method="POST">
          <input name="name" type="text" />
          <input name="email" type="email" />
          <input name="phone" type="tel" />
          <input name="org" type="text" />
          <input name="urls[LinkedIn]" type="text" />
          <input name="urls[Portfolio]" type="text" />
          <input name="resume" type="file" />
        </form>
      </body>
      </html>
    `;
    const dom = setupDOM(leverHtml, 'https://jobs.lever.co/company/job-id');
    const { window } = dom;
    const document = window.document;

    const isDetected = window.ATSLever.detect(window.location.href, document);
    const stats = await window.ATSLever.fill(sampleProfile, 'http://localhost:8000');

    const expected = {
      'details.given_names': 'Jane Doe',
      'details.email_address': 'jane.doe@example.com',
      'details.phone_number': '+1 555-123-4567',
      'work_experience[0].company': 'Tech Corp',
      'details.linkedin_url': 'https://linkedin.com/in/janedoe',
      'details.websites': 'https://janedoe.dev'
    };

    let filledCount = 0;
    let correctCount = 0;
    const totalFillable = Object.keys(expected).length + 1; // +1 for resume

    for (const [key, expectedVal] of Object.entries(expected)) {
      const el = document.querySelector(`[data-ats-field-key="${key}"]`);
      if (el && el.value) {
        filledCount++;
        if (el.value === expectedVal) correctCount++;
      }
    }
    const resumeInput = document.querySelector('[data-ats-field-key="resume"]');
    if (resumeInput) filledCount++; // mock file set

    const pct = Math.round((correctCount / Object.keys(expected).length) * 100);
    results.Lever = { detected: isDetected, total: totalFillable, filled: stats.filled.length, correct: correctCount, percentage: pct };
    console.log(`✓ Lever Test: Detected=${isDetected}, Filled=${stats.filled.length}/${totalFillable}, Correctness=${pct}% (${correctCount}/${Object.keys(expected).length})`);
  }

  // ----------------------------------------------------
  // TEST 2: WORKDAY ATS (Native Web Component Shadow DOM)
  // ----------------------------------------------------
  {
    const workdayHtml = `
      <!DOCTYPE html>
      <html>
      <body>
        <div id="workday-root"></div>
      </body>
      </html>
    `;
    const dom = setupDOM(workdayHtml, 'https://company.myworkdayjobs.com/en-US/careers/job/123');
    const { window } = dom;
    const document = window.document;

    // Build Web Component Shadow DOM structure
    const rootEl = document.getElementById('workday-root');
    const shadow = rootEl.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <div data-automation-id="workdayApplication">
        <div data-automation-id="pageHeader">My Information</div>
        <input data-automation-id="legalNameSection_firstName" type="text" />
        <input data-automation-id="legalNameSection_lastName" type="text" />
        <input data-automation-id="addressSection_addressLine1" type="text" />
        <input data-automation-id="addressSection_city" type="text" />
        <input data-automation-id="addressSection_postalCode" type="text" />
        <input data-automation-id="email" type="email" />
        <input data-automation-id="phone-number" type="tel" />
        <input data-automation-id="linkedin-url" type="text" />
        <select data-automation-id="gender">
          <option value="">Select</option>
          <option value="Female">Female</option>
          <option value="Male">Male</option>
        </select>
        <select data-automation-id="veteranStatus">
          <option value="">Select</option>
          <option value="I am not a protected veteran">I am not a protected veteran</option>
        </select>
      </div>
    `;

    const isDetected = window.ATSWorkday.detect(window.location.href, document);
    const stats = await window.ATSWorkday.fill(sampleProfile, 'http://localhost:8000');

    const expected = {
      'details.given_names': 'Jane',
      'details.family_name': 'Doe',
      'details.address_line_1': '123 Market St',
      'details.city': 'San Francisco',
      'details.postal_code': '94105',
      'details.email_address': 'jane.doe@example.com',
      'details.phone_number': '+1 555-123-4567',
      'details.linkedin_url': 'https://linkedin.com/in/janedoe',
      'details.gender': 'Female',
      'details.protected_veteran_status': 'I am not a protected veteran'
    };

    let filledCount = 0;
    let correctCount = 0;
    const totalFillable = Object.keys(expected).length;

    for (const [key, expectedVal] of Object.entries(expected)) {
      const el = window.ATSHelpers.querySelectorDeep(`[data-ats-field-key="${key}"]`, document);
      if (el && el.value) {
        filledCount++;
        if (el.value === expectedVal) correctCount++;
      }
    }

    const pct = Math.round((correctCount / totalFillable) * 100);
    results.Workday = { detected: isDetected, total: totalFillable, filled: stats.filled.length, correct: correctCount, percentage: pct };
    console.log(`✓ Workday Test (Shadow DOM): Detected=${isDetected}, Filled=${stats.filled.length}/${totalFillable}, Correctness=${pct}% (${correctCount}/${totalFillable})`);
  }

  // ----------------------------------------------------
  // TEST 3: iCIMS ATS (Embedded Iframe Context)
  // ----------------------------------------------------
  {
    // In Manifest V3 with all_frames: true, content script runs inside iframe's own document scope!
    const icimsFrameHtml = `
      <!DOCTYPE html>
      <html>
      <body class="icims-form">
        <form>
          <input name="FirstName" id="rc_FirstName" type="text" />
          <input name="LastName" id="rc_LastName" type="text" />
          <input name="Email" id="rc_Email" type="email" />
          <input name="Phone" id="rc_Phone" type="tel" />
          <input name="AddressLine1" id="rc_AddressLine1" type="text" />
          <input name="City" id="rc_City" type="text" />
          <input name="PostalCode" id="rc_PostalCode" type="text" />
          <input type="file" id="rc_Resume" />
        </form>
      </body>
      </html>
    `;
    const dom = setupDOM(icimsFrameHtml, 'https://careers-company.icims.com/jobs/123/applicant');
    const { window } = dom;
    const document = window.document;

    const isDetected = window.ATSiCIMS.detect(window.location.href, document);
    const stats = await window.ATSiCIMS.fill(sampleProfile, 'http://localhost:8000');

    const expected = {
      'details.given_names': 'Jane',
      'details.family_name': 'Doe',
      'details.email_address': 'jane.doe@example.com',
      'details.phone_number': '+1 555-123-4567',
      'details.address_line_1': '123 Market St',
      'details.city': 'San Francisco',
      'details.postal_code': '94105'
    };

    let filledCount = 0;
    let correctCount = 0;
    const totalFillable = Object.keys(expected).length;

    for (const [key, expectedVal] of Object.entries(expected)) {
      const el = document.querySelector(`[data-ats-field-key="${key}"]`);
      if (el && el.value) {
        filledCount++;
        if (el.value === expectedVal) correctCount++;
      }
    }

    const pct = Math.round((correctCount / totalFillable) * 100);
    results.iCIMS = { detected: isDetected, total: totalFillable, filled: stats.filled.length, correct: correctCount, percentage: pct };
    console.log(`✓ iCIMS Test (Iframe): Detected=${isDetected}, Filled=${stats.filled.length}/${totalFillable}, Correctness=${pct}% (${correctCount}/${totalFillable})`);
  }

  // ----------------------------------------------------
  // TEST 4: GREENHOUSE ATS (Embedded Iframe Context)
  // ----------------------------------------------------
  {
    const greenhouseFrameHtml = `
      <!DOCTYPE html>
      <html>
      <body>
        <form id="application_form">
          <input name="job_application[first_name]" id="first_name" type="text" />
          <input name="job_application[last_name]" id="last_name" type="text" />
          <input name="job_application[email]" id="email" type="email" />
          <input name="job_application[phone]" id="phone" type="tel" />
          <input name="job_application[answers][linkedin]" id="linkedin_url" type="text" />
          <select name="job_application[gender]" id="gender_id">
            <option value="">Select</option>
            <option value="Female">Female</option>
            <option value="Male">Male</option>
          </select>
          <select name="job_application[veteran]" id="veteran_status_id">
            <option value="">Select</option>
            <option value="I am not a protected veteran">I am not a protected veteran</option>
          </select>
          <input name="job_application[company]" type="text" />
          <input name="job_application[title]" type="text" />
          <input type="file" id="resume_file" />
        </form>
      </body>
      </html>
    `;
    const dom = setupDOM(greenhouseFrameHtml, 'https://boards.greenhouse.io/embed/job_app?token=123');
    const { window } = dom;
    const document = window.document;

    const isDetected = window.ATSGreenhouse.detect(window.location.href, document);
    const stats = await window.ATSGreenhouse.fill(sampleProfile, 'http://localhost:8000');

    const expected = {
      'details.given_names': 'Jane',
      'details.family_name': 'Doe',
      'details.email_address': 'jane.doe@example.com',
      'details.phone_number': '+1 555-123-4567',
      'details.linkedin_url': 'https://linkedin.com/in/janedoe',
      'details.gender': 'Female',
      'details.protected_veteran_status': 'I am not a protected veteran',
      'work_experience[0].company': 'Tech Corp',
      'work_experience[0].job_title': 'Senior Software Engineer'
    };

    let filledCount = 0;
    let correctCount = 0;
    const totalFillable = Object.keys(expected).length;

    for (const [key, expectedVal] of Object.entries(expected)) {
      const el = document.querySelector(`[data-ats-field-key="${key}"]`);
      if (el && el.value) {
        filledCount++;
        if (el.value === expectedVal) correctCount++;
      }
    }

    const pct = Math.round((correctCount / totalFillable) * 100);
    results.Greenhouse = { detected: isDetected, total: totalFillable, filled: stats.filled.length, correct: correctCount, percentage: pct };
    console.log(`✓ Greenhouse Test (Iframe): Detected=${isDetected}, Filled=${stats.filled.length}/${totalFillable}, Correctness=${pct}% (${correctCount}/${totalFillable})`);
  }

  console.log('\n====================================================');
  console.log('  FINAL VERIFICATION SUMMARY');
  console.log('====================================================');
  let passAll = true;
  for (const [ats, res] of Object.entries(results)) {
    const status = (res.detected && res.percentage >= 80) ? 'PASS' : 'FAIL';
    if (status === 'FAIL') passAll = false;
    console.log(`- ${ats}: ${res.correct}/${res.total} fields correct (${res.percentage}%) -> ${status}`);
  }

  if (!passAll) {
    console.error('\n❌ Test suite failed accuracy requirements!');
    process.exit(1);
  } else {
    console.log('\n🎉 ALL 4 ATS PLATFORMS PASSED WITH >= 80% ACCURACY!');
  }
}

runTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
