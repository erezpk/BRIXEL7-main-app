interface NotificationData {
  action: 'created' | 'updated' | 'deleted' | 'meeting_created' | 'email_sent' | 'status_changed';
  entityType: 'lead' | 'client' | 'project' | 'task';
  entityId: string;
  details: {
    leadName?: string;
    leadId?: string;
    clientName?: string;
    clientId?: string;
    projectName?: string;
    projectId?: string;
    taskTitle?: string;
    taskId?: string;
    userName?: string;
    oldStatus?: string;
    newStatus?: string;
    meetingTitle?: string;
    meetingDate?: string;
  };
}

export class NotificationManager {
  private static notifications: any[] = [];

  static async createNotification(data: NotificationData) {
    const notification = {
      id: Math.random().toString(36).substr(2, 9),
      ...data,
      createdAt: new Date().toISOString(),
      isRead: false
    };

    this.notifications.unshift(notification);
    
    // Keep only last 50 notifications
    if (this.notifications.length > 50) {
      this.notifications = this.notifications.slice(0, 50);
    }

    // Store in localStorage for persistence
    localStorage.setItem('systemNotifications', JSON.stringify(this.notifications));

    return notification;
  }

  static getNotifications() {
    // Load from localStorage if not in memory
    if (this.notifications.length === 0) {
      const stored = localStorage.getItem('systemNotifications');
      if (stored) {
        this.notifications = JSON.parse(stored);
      }
    }
    return this.notifications;
  }

  static clearNotifications() {
    this.notifications = [];
    localStorage.removeItem('systemNotifications');
  }
}

// Helper functions for common notification types
export const notifyLeadCreated = (leadName: string, leadId: string, userName: string) => {
  return NotificationManager.createNotification({
    action: 'created',
    entityType: 'lead',
    entityId: leadId,
    details: {
      leadName,
      leadId,
      userName
    }
  });
};

export const notifyLeadUpdated = (leadName: string, leadId: string, userName: string) => {
  return NotificationManager.createNotification({
    action: 'updated',
    entityType: 'lead',
    entityId: leadId,
    details: {
      leadName,
      leadId,
      userName
    }
  });
};

export const notifyStatusChanged = (leadName: string, leadId: string, oldStatus: string, newStatus: string, userName: string) => {
  return NotificationManager.createNotification({
    action: 'status_changed',
    entityType: 'lead',
    entityId: leadId,
    details: {
      leadName,
      leadId,
      userName,
      oldStatus,
      newStatus
    }
  });
};

export const notifyMeetingCreated = (leadName: string, leadId: string, meetingTitle: string, meetingDate: string, userName: string) => {
  return NotificationManager.createNotification({
    action: 'meeting_created',
    entityType: 'lead',
    entityId: leadId,
    details: {
      leadName,
      leadId,
      meetingTitle,
      meetingDate,
      userName
    }
  });
};

export const notifyEmailSent = (leadName: string, leadId: string, userName: string) => {
  return NotificationManager.createNotification({
    action: 'email_sent',
    entityType: 'lead',
    entityId: leadId,
    details: {
      leadName,
      leadId,
      userName
    }
  });
};