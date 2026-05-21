const welcomeEmail = (name) => `
  <div style="font-family:'Segoe UI',sans-serif;max-width:520px;margin:auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
    
    <div style="background:#6366f1;padding:36px 32px;text-align:center">
      <h1 style="color:#fff;margin:0;font-size:26px;font-weight:800;letter-spacing:-0.5px">Smart Khata</h1>
      <p style="color:rgba(255,255,255,0.8);margin:6px 0 0;font-size:14px">Business Management Platform</p>
    </div>

    <div style="padding:36px 32px">
      <h2 style="color:#0f172a;font-size:20px;font-weight:700;margin:0 0 8px">Welcome, ${name}! 🎉</h2>
      <p style="color:#64748b;font-size:14px;line-height:1.7;margin:0 0 24px">
        Your account has been created successfully. You can now log in and start managing your business with Smart Khata.
      </p>

      <div style="background:#f8fafc;border-radius:12px;padding:20px;margin-bottom:24px;border:1px solid #f1f5f9">
        <p style="color:#475569;font-size:13px;margin:0 0 6px;font-weight:600">What you can do:</p>
        <ul style="color:#64748b;font-size:13px;line-height:2;margin:0;padding-left:18px">
          <li>Manage your stock and inventory</li>
          <li>Track orders in real time</li>
          <li>View reports and analytics</li>
          <li>Manage employees and customers</li>
        </ul>
      </div>

      <a href="${process.env.CLIENT_URL}" 
        style="display:inline-block;background:#6366f1;color:#fff;padding:13px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px">
        Go to Dashboard →
      </a>
    </div>

    <div style="padding:20px 32px;background:#f8fafc;border-top:1px solid #f1f5f9;text-align:center">
      <p style="color:#94a3b8;font-size:12px;margin:0">© 2025 Smart Khata. All rights reserved.</p>
    </div>
  </div>
`;

const forgotPasswordEmail = (name, resetLink) => `
  <div style="font-family:'Segoe UI',sans-serif;max-width:520px;margin:auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
    
    <div style="background:#ef4444;padding:36px 32px;text-align:center">
      <h1 style="color:#fff;margin:0;font-size:26px;font-weight:800;letter-spacing:-0.5px">Smart Khata</h1>
      <p style="color:rgba(255,255,255,0.8);margin:6px 0 0;font-size:14px">Password Reset Request</p>
    </div>

    <div style="padding:36px 32px">
      <h2 style="color:#0f172a;font-size:20px;font-weight:700;margin:0 0 8px">Hi, ${name}</h2>
      <p style="color:#64748b;font-size:14px;line-height:1.7;margin:0 0 24px">
        We received a request to reset your password. Click the button below to set a new one. This link will expire in <strong>15 minutes</strong>.
      </p>

      <a href="${resetLink}"
        style="display:inline-block;background:#ef4444;color:#fff;padding:13px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px;margin-bottom:24px">
        Reset My Password →
      </a>

      <div style="background:#fef2f2;border-radius:12px;padding:16px 20px;border:1px solid #fee2e2">
        <p style="color:#ef4444;font-size:13px;margin:0;font-weight:600">⚠️ If you didn't request this, ignore this email. Your password will not change.</p>
      </div>
    </div>

    <div style="padding:20px 32px;background:#f8fafc;border-top:1px solid #f1f5f9;text-align:center">
      <p style="color:#94a3b8;font-size:12px;margin:0">© 2025 Smart Khata. All rights reserved.</p>
    </div>
  </div>
`;

module.exports = { welcomeEmail, forgotPasswordEmail };