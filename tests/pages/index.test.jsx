import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Home from '../../pages/index';

// Mock fetch
global.fetch = jest.fn();

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  clear: jest.fn()
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Silence console logs
console.log = jest.fn();
console.error = jest.fn();

describe('Home page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock successful fetch responses
    global.fetch.mockImplementation((url) => {
      if (url.includes('/api/email')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({
            success: true,
            message: 'Success',
            smtpHost: 'smtp-relay.brevo.com',
            smtpPort: '587',
            smtpUser: '***',
            smtpPass: '***',
            fromEmail: 'test@example.com',
            fromName: 'Test User',
            brevoApiKey: '***'
          })
        });
      }
      return Promise.reject(new Error('Not found'));
    });
  });

  test('renders the email form', () => {
    render(<Home />);
    expect(screen.getByText('Brevo Email Sender')).toBeInTheDocument();
    // Find the send email button in the active tab content
    const sendEmailElements = screen.getAllByText('Send Email');
    expect(sendEmailElements.length).toBeGreaterThan(0);
  });

  test('switches between tabs', async () => {
    render(<Home />);
    
    // Find and click the Settings tab
    const settingsTab = screen.getByText('Settings');
    fireEvent.click(settingsTab);
    
    // Verify settings form is displayed
    await waitFor(() => {
      expect(screen.getByText('Email Service Settings')).toBeInTheDocument();
    });
    
    // Get all elements with "Send Email" text and find the tab (should be the first one)
    const sendEmailElements = screen.getAllByText('Send Email');
    // Find the one that's a tab (has a parent with class "tabs")
    const emailTab = sendEmailElements.find(el => 
      el.parentElement && el.parentElement.className.includes('tab')
    );
    
    if (!emailTab) {
      throw new Error('Could not find the Send Email tab');
    }
    
    fireEvent.click(emailTab);
    
    // Verify email form is displayed again
    await waitFor(() => {
      expect(screen.getByLabelText('To:')).toBeInTheDocument();
    });
  });

  test('submits the email form', async () => {
    // Mock successful email submission
    global.fetch.mockImplementationOnce(() => 
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          success: true,
          message: 'Email sent successfully',
          messageId: 'test-message-id'
        })
      })
    );
    
    render(<Home />);
    
    // Fill out the email form
    fireEvent.change(screen.getByLabelText('To:'), { 
      target: { value: 'recipient@example.com' } 
    });
    
    fireEvent.change(screen.getByLabelText('Subject:'), { 
      target: { value: 'Test Subject' } 
    });
    
    fireEvent.change(screen.getByLabelText('Message:'), { 
      target: { value: 'Test message body' } 
    });
    
    // Find the submit button (it's the one inside a form)
    const buttons = screen.getAllByText('Send Email');
    const sendButton = buttons.find(el => 
      el.tagName.toLowerCase() === 'button' && el.type === 'submit'
    );
    
    if (!sendButton) {
      throw new Error('Could not find the Send Email button');
    }
    
    fireEvent.click(sendButton);
    
    // Verify success message is displayed
    await waitFor(() => {
      expect(screen.getByText(/Email sent successfully/i)).toBeInTheDocument();
    });
    
    // Verify fetch was called with the right arguments
    expect(global.fetch).toHaveBeenCalledWith('/api/email', expect.any(Object));
  });

  test('sends email correctly', async () => {
    global.fetch.mockImplementationOnce(() => 
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          success: true,
          message: 'Email sent successfully',
          messageId: 'test-id-123'
        })
      })
    );
    
    render(<Home />);
    
    fireEvent.change(screen.getByLabelText('To:'), {
      target: { value: 'recipient@example.com' }
    });
    
    fireEvent.change(screen.getByLabelText('Subject:'), {
      target: { value: 'Test Subject' }
    });
    
    fireEvent.change(screen.getByLabelText('Message:'), {
      target: { value: 'Test message content' }
    });
    
    fireEvent.submit(screen.getByLabelText('To:').closest('form'));
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/email',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('recipient@example.com')
        })
      );
    });
    
    await waitFor(() => {
      expect(screen.getByText(/Email sent successfully/i)).toBeInTheDocument();
    });
  });

  test('saves settings correctly', async () => {
    render(<Home />);
    
    // Click on the Settings tab
    const settingsTab = screen.getByText('Settings');
    fireEvent.click(settingsTab);
    
    // Fill in settings form
    fireEvent.change(screen.getByLabelText('SMTP Host:'), {
      target: { value: 'new-smtp.example.com' }
    });
    
    fireEvent.change(screen.getByLabelText('SMTP Port:'), {
      target: { value: '25' }
    });
    
    fireEvent.change(screen.getByLabelText('SMTP User:'), {
      target: { value: 'new-user' }
    });
    
    fireEvent.change(screen.getByLabelText('SMTP Password:'), {
      target: { value: 'new-password' }
    });
    
    fireEvent.change(screen.getByLabelText('From Email:'), {
      target: { value: 'new@example.com' }
    });
    
    fireEvent.change(screen.getByLabelText('From Name:'), {
      target: { value: 'New User' }
    });
    
    // Click the save button
    fireEvent.click(screen.getByText('Save Settings'));
    
    await waitFor(() => {
      expect(window.localStorage.setItem).toHaveBeenCalledWith(
        'brevoSettings',
        expect.any(String)
      );
    });
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/email',
        expect.any(Object)
      );
    });
  });
});
