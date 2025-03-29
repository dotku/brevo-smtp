import React, { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import Head from 'next/head';
import styles from '../styles/Home.module.css';

interface Settings {
  smtpHost: string;
  smtpPort: string;
  smtpUser: string;
  smtpPass: string;
  fromEmail: string;
  fromName: string;
  brevoApiKey: string;
}

interface EmailFormData {
  to: string;
  subject: string;
  message: string;
}

interface ResultState {
  message: string;
  type: string;
  visible: boolean;
}

export default function Home() {
  const [activeTab, setActiveTab] = useState('email');
  const [settings, setSettings] = useState<Settings>({
    smtpHost: '',
    smtpPort: '',
    smtpUser: '',
    smtpPass: '',
    fromEmail: '',
    fromName: '',
    brevoApiKey: '',
  });
  const [emailForm, setEmailForm] = useState<EmailFormData>({
    to: '',
    subject: '',
    message: '',
  });
  const [result, setResult] = useState<ResultState>({ message: '', type: '', visible: false });
  const [settingsResult, setSettingsResult] = useState<ResultState>({ message: '', type: '', visible: false });
  const [envStatus, setEnvStatus] = useState<ResultState>({ message: '', type: '', visible: false });

  // Load settings from localStorage on component mount
  useEffect(() => {
    loadSettings();
    checkEnvironmentStatus();
  }, []);

  // Load settings from localStorage
  const loadSettings = () => {
    if (typeof window !== 'undefined') {
      const storedSettings = localStorage.getItem('brevoSettings');
      if (storedSettings) {
        setSettings(JSON.parse(storedSettings));
      }
    }
  };

  // Helper function to mask sensitive data (e.g. passwords, API keys) for display purposes only
  const maskSensitiveData = (value: string): string => {
    if (!value) return '';
    if (value.startsWith('your_') || value.startsWith('your-')) return value;
    
    // Show first 3 characters and mask the rest
    const firstPart = value.substring(0, 3);
    const maskedPart = '*'.repeat(Math.min(value.length - 3, 10));
    return `${firstPart}${maskedPart}`;
  };

  // Function to get placeholder or masked value
  const getPlaceholderOrMasked = (value: string, defaultPlaceholder: string): string => {
    if (!value) return defaultPlaceholder;
    if (value.startsWith('your_') || value.startsWith('your-')) return defaultPlaceholder;
    return maskSensitiveData(value);
  };

  // Check if environment variables are loaded
  const checkEnvironmentStatus = async () => {
    try {
      const response = await fetch('/api/email');
      const data = await response.json();
      
      if (!data.envVarsLoaded) {
        // Environment variables not loaded, show warning
        setEnvStatus({
          message: 'Environment variables not detected. Please configure settings in the Settings tab.',
          type: 'error',
          visible: true
        });
        
        // Switch to settings tab automatically
        setActiveTab('settings');
      } else {
        // Environment variables loaded, show success message with masked values
        const maskedEmail = maskSensitiveData(data.fromEmail || '');
        const maskedUser = maskSensitiveData(data.smtpUser || '');
        const maskedPass = data.smtpPass || '';
        
        setEnvStatus({
          message: `Environment configured with email: ${maskedEmail}, user: ${maskedUser}, password: ${maskedPass}`,
          type: 'success',
          visible: true
        });
        
        // Pre-fill settings with server values
        setSettings(prev => ({
          ...prev,
          fromEmail: data.fromEmail || prev.fromEmail,
          fromName: data.fromName || prev.fromName,
          smtpUser: data.smtpUser || prev.smtpUser,
          smtpPass: prev.smtpPass, // Keep existing password if user has entered one
          brevoApiKey: prev.brevoApiKey, // Keep existing API key if user has entered one
        }));
      }
    } catch (error) {
      console.error('Error checking environment status:', error);
    }
  };

  // Save settings to localStorage
  const handleSettingsSubmit = (e: FormEvent) => {
    e.preventDefault();
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('brevoSettings', JSON.stringify(settings));
      
      setSettingsResult({
        message: 'Settings saved successfully!',
        type: 'success',
        visible: true
      });
      
      setTimeout(() => {
        setSettingsResult(prev => ({ ...prev, visible: false }));
      }, 3000);
    }
  };

  // Handle email form submission
  const handleEmailSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    setResult({
      message: 'Sending email...',
      type: '',
      visible: true
    });
    
    try {
      // Get settings from localStorage
      const storedSettings = typeof window !== 'undefined' 
        ? JSON.parse(localStorage.getItem('brevoSettings') || '{}')
        : {};
      
      // Check if we have the minimum required settings
      if (!storedSettings.brevoApiKey && envStatus.type === 'error') {
        setResult({
          message: 'Error: Missing API key. Please configure settings in the Settings tab.',
          type: 'error',
          visible: true
        });
        
        // Switch to settings tab automatically
        setActiveTab('settings');
        return;
      }
      
      const response = await fetch('/api/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: emailForm.to,
          subject: emailForm.subject,
          text: emailForm.message,
          html: `<p>${emailForm.message.replace(/\n/g, '<br>')}</p>`,
          settings: storedSettings
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setResult({
          message: `Email sent successfully! Message ID: ${data.messageId}${data.usedClientSettings ? ' (Used your browser settings)' : ''}`,
          type: 'success',
          visible: true
        });
        setEmailForm({ to: '', subject: '', message: '' });
      } else {
        if (data.needsSettings) {
          setResult({
            message: `Error: ${data.error} - ${data.details || ''}`,
            type: 'error',
            visible: true
          });
          
          // Switch to settings tab automatically
          setActiveTab('settings');
        } else {
          setResult({
            message: `Error: ${data.error} - ${data.details || ''}`,
            type: 'error',
            visible: true
          });
        }
      }
    } catch (error: any) {
      setResult({
        message: `Error: ${error.message}`,
        type: 'error',
        visible: true
      });
    }
  };

  // Handle form input changes
  const handleEmailChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEmailForm(prev => ({ ...prev, [name]: value }));
  };

  // Handle settings input changes
  const handleSettingsChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className={styles.container}>
      <Head>
        <title>Brevo Email Sender</title>
        <meta name="description" content="Email sending service using Vercel and Brevo SMTP" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <h1 className={styles.title}>Brevo Email Sender</h1>
        
        <div className={styles.tabs}>
          <div 
            className={`${styles.tab} ${activeTab === 'email' ? styles.active : ''}`}
            onClick={() => setActiveTab('email')}
          >
            Send Email
          </div>
          <div 
            className={`${styles.tab} ${activeTab === 'settings' ? styles.active : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            Settings
          </div>
        </div>
        
        <div className={`${styles.tabContent} ${activeTab === 'email' ? styles.active : ''}`}>
          {envStatus.visible && (
            <div className={`${styles.result} ${styles[envStatus.type]}`}>
              {envStatus.message}
            </div>
          )}
          
          <form onSubmit={handleEmailSubmit}>
            <div className={styles.formGroup}>
              <label htmlFor="to">To:</label>
              <input 
                type="email" 
                id="to" 
                name="to" 
                value={emailForm.to}
                onChange={handleEmailChange}
                required 
                placeholder="recipient@example.com" 
              />
            </div>
            
            <div className={styles.formGroup}>
              <label htmlFor="subject">Subject:</label>
              <input 
                type="text" 
                id="subject" 
                name="subject" 
                value={emailForm.subject}
                onChange={handleEmailChange}
                required 
                placeholder="Email subject" 
              />
            </div>
            
            <div className={styles.formGroup}>
              <label htmlFor="message">Message:</label>
              <textarea 
                id="message" 
                name="message" 
                value={emailForm.message}
                onChange={handleEmailChange}
                required 
                placeholder="Your email message..." 
              />
            </div>
            
            <button type="submit" className={styles.button}>Send Email</button>
          </form>
          
          {result.visible && (
            <div className={`${styles.result} ${styles[result.type]}`}>
              {result.message}
            </div>
          )}
        </div>
        
        <div className={`${styles.tabContent} ${activeTab === 'settings' ? styles.active : ''}`}>
          <div className={styles.settingsContainer}>
            <h2>Email Service Settings</h2>
            <p>Configure your Brevo email service settings below. These settings will be saved in your browser's localStorage.</p>
            
            <form onSubmit={handleSettingsSubmit}>
              <div className={styles.settingsRow}>
                <div className={styles.settingsCol}>
                  <div className={styles.formGroup}>
                    <label htmlFor="smtpHost">SMTP Host:</label>
                    <input 
                      type="text" 
                      id="smtpHost" 
                      name="smtpHost" 
                      value={settings.smtpHost}
                      onChange={handleSettingsChange}
                      placeholder="smtp-relay.brevo.com" 
                    />
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label htmlFor="smtpPort">SMTP Port:</label>
                    <input 
                      type="number" 
                      id="smtpPort" 
                      name="smtpPort" 
                      value={settings.smtpPort}
                      onChange={handleSettingsChange}
                      placeholder="587" 
                    />
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label htmlFor="smtpUser">SMTP User:</label>
                    <input 
                      type="text" 
                      id="smtpUser" 
                      name="smtpUser" 
                      value={settings.smtpUser}
                      onChange={handleSettingsChange}
                      placeholder="username@example.com" 
                    />
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label htmlFor="smtpPass">SMTP Password:</label>
                    <input 
                      type="password" 
                      id="smtpPass" 
                      name="smtpPass" 
                      value={settings.smtpPass}
                      onChange={handleSettingsChange}
                      placeholder="8PG***********" 
                    />
                  </div>
                </div>
                
                <div className={styles.settingsCol}>
                  <div className={styles.formGroup}>
                    <label htmlFor="fromEmail">From Email:</label>
                    <input 
                      type="email" 
                      id="fromEmail" 
                      name="fromEmail" 
                      value={settings.fromEmail}
                      onChange={handleSettingsChange}
                      placeholder="your-email@example.com" 
                    />
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label htmlFor="fromName">From Name:</label>
                    <input 
                      type="text" 
                      id="fromName" 
                      name="fromName" 
                      value={settings.fromName}
                      onChange={handleSettingsChange}
                      placeholder="Your Name" 
                    />
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label htmlFor="brevoApiKey">Brevo API Key:</label>
                    <input 
                      type="password" 
                      id="brevoApiKey" 
                      name="brevoApiKey" 
                      value={settings.brevoApiKey}
                      onChange={handleSettingsChange}
                      placeholder="xke***********" 
                    />
                  </div>
                </div>
              </div>
              
              <button type="submit" className={styles.button}>Save Settings</button>
            </form>
            
            {settingsResult.visible && (
              <div className={`${styles.result} ${styles[settingsResult.type]}`}>
                {settingsResult.message}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
