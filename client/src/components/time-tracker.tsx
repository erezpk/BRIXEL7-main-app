import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Play, 
  Pause, 
  Square, 
  Clock, 
  Edit, 
  Trash2, 
  Check,
  X
} from 'lucide-react';

interface TimeEntry {
  id: string;
  projectId: string;
  taskId?: string;
  userId: string;
  description?: string;
  startTime: number;
  endTime?: number;
  duration?: number; // in minutes
  hourlyRate?: number;
  billable: boolean;
  approved: boolean;
  createdAt: number;
  updatedAt: number;
}

interface TimeTrackerProps {
  projectId: string;
  projectName?: string;
  onTimeEntryUpdated?: () => void;
}

export function TimeTracker({ projectId, projectName, onTimeEntryUpdated }: TimeTrackerProps) {
  const [isTracking, setIsTracking] = useState(false);
  const [currentEntry, setCurrentEntry] = useState<TimeEntry | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [newEntryDescription, setNewEntryDescription] = useState('');
  const [editingEntry, setEditingEntry] = useState<string | null>(null);
  const [editDescription, setEditDescription] = useState('');
  const [editDuration, setEditDuration] = useState('');
  const [loading, setLoading] = useState(true);

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isTracking && currentEntry) {
      interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - currentEntry.startTime) / 1000 / 60);
        setElapsedTime(elapsed);
      }, 1000);
    }
    
    return () => clearInterval(interval);
  }, [isTracking, currentEntry]);

  // Load time entries
  useEffect(() => {
    if (projectId) {
      fetchTimeEntries();
    }
  }, [projectId]);

  const fetchTimeEntries = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/analytics/time-entries/project/${projectId}`);
      if (response.ok) {
        const entries = await response.json();
        setTimeEntries(entries.sort((a: TimeEntry, b: TimeEntry) => b.createdAt - a.createdAt));
        
        // Check if there's an active entry
        const activeEntry = entries.find((e: TimeEntry) => !e.endTime);
        if (activeEntry) {
          setCurrentEntry(activeEntry);
          setIsTracking(true);
          setElapsedTime(Math.floor((Date.now() - activeEntry.startTime) / 1000 / 60));
        }
      }
    } catch (error) {
      console.error('Error fetching time entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const startTracking = async () => {
    try {
      const response = await fetch('/api/analytics/time-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          description: newEntryDescription || `עבודה על ${projectName || 'הפרויקט'}`
        })
      });

      if (response.ok) {
        const entry = await response.json();
        setCurrentEntry(entry);
        setIsTracking(true);
        setElapsedTime(0);
        setNewEntryDescription('');
        onTimeEntryUpdated?.();
      }
    } catch (error) {
      console.error('Error starting time tracking:', error);
    }
  };

  const stopTracking = async () => {
    if (!currentEntry) return;

    try {
      const response = await fetch(`/api/analytics/time-entries/${currentEntry.id}/stop`, {
        method: 'PUT'
      });

      if (response.ok) {
        setIsTracking(false);
        setCurrentEntry(null);
        setElapsedTime(0);
        fetchTimeEntries();
        onTimeEntryUpdated?.();
      }
    } catch (error) {
      console.error('Error stopping time tracking:', error);
    }
  };

  const deleteEntry = async (entryId: string) => {
    try {
      const response = await fetch(`/api/analytics/time-entries/${entryId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        fetchTimeEntries();
        onTimeEntryUpdated?.();
      }
    } catch (error) {
      console.error('Error deleting time entry:', error);
    }
  };

  const startEditing = (entry: TimeEntry) => {
    setEditingEntry(entry.id);
    setEditDescription(entry.description || '');
    setEditDuration(entry.duration ? Math.floor(entry.duration / 60).toString() : '');
  };

  const saveEdit = async (entryId: string) => {
    try {
      const durationMinutes = parseFloat(editDuration) * 60;
      const response = await fetch(`/api/analytics/time-entries/${entryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: editDescription,
          duration: durationMinutes
        })
      });

      if (response.ok) {
        setEditingEntry(null);
        fetchTimeEntries();
        onTimeEntryUpdated?.();
      }
    } catch (error) {
      console.error('Error updating time entry:', error);
    }
  };

  const cancelEdit = () => {
    setEditingEntry(null);
    setEditDescription('');
    setEditDuration('');
  };

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}:${mins.toString().padStart(2, '0')}`;
  };

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString('he-IL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Timer Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            מעקב זמן בזמן אמת
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isTracking ? (
            <div className="space-y-3">
              <Textarea
                placeholder="תיאור המשימה (אופציונלי)"
                value={newEntryDescription}
                onChange={(e) => setNewEntryDescription(e.target.value)}
                className="min-h-[80px]"
              />
              <Button onClick={startTracking} className="w-full bg-green-600 hover:bg-green-700">
                <Play className="w-4 h-4 ml-2" />
                התחל מעקב זמן
              </Button>
            </div>
          ) : (
            <div className="text-center space-y-4">
              <div className="text-4xl font-bold text-green-600">
                {formatDuration(elapsedTime)}
              </div>
              <p className="text-gray-600">{currentEntry?.description}</p>
              <Button onClick={stopTracking} variant="destructive" className="w-full">
                <Square className="w-4 h-4 ml-2" />
                עצור ושמור
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Time Entries History */}
      <Card>
        <CardHeader>
          <CardTitle>היסטוריית זמנים</CardTitle>
        </CardHeader>
        <CardContent>
          {timeEntries.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Clock className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>עדיין אין רישומי זמן לפרויקט זה</p>
              <p className="text-sm">התחל מעקב זמן כדי לראות את הנתונים כאן</p>
            </div>
          ) : (
            <div className="space-y-3">
              {timeEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1">
                    {editingEntry === entry.id ? (
                      <div className="space-y-2">
                        <Input
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          placeholder="תיאור המשימה"
                        />
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            step="0.1"
                            value={editDuration}
                            onChange={(e) => setEditDuration(e.target.value)}
                            placeholder="שעות"
                            className="w-20"
                          />
                          <span className="text-sm text-gray-500">שעות</span>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p className="font-medium">{entry.description}</p>
                        <p className="text-sm text-gray-500">
                          {formatDate(entry.startTime)}
                          {entry.endTime && ` - ${formatDate(entry.endTime)}`}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {editingEntry === entry.id ? (
                      <div className="flex items-center gap-1">
                        <Button size="sm" onClick={() => saveEdit(entry.id)}>
                          <Check className="w-3 h-3" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={cancelEdit}>
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {entry.duration ? formatDuration(entry.duration) : 'פעיל'}
                        </Badge>
                        {entry.billable && (
                          <Badge className="bg-green-100 text-green-800">
                            לחיוב
                          </Badge>
                        )}
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => startEditing(entry)}
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => deleteEntry(entry.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary */}
      {timeEntries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>סיכום</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">
                  {timeEntries.filter(e => e.endTime).length}
                </p>
                <p className="text-sm text-gray-600">רישומים הושלמו</p>
              </div>
              
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {formatDuration(
                    timeEntries
                      .filter(e => e.duration)
                      .reduce((sum, e) => sum + (e.duration || 0), 0)
                  )}
                </p>
                <p className="text-sm text-gray-600">סה״כ זמן</p>
              </div>
              
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600">
                  {timeEntries.filter(e => e.billable).length}
                </p>
                <p className="text-sm text-gray-600">לחיוב</p>
              </div>
              
              <div className="text-center">
                <p className="text-2xl font-bold text-orange-600">
                  {timeEntries.filter(e => e.approved).length}
                </p>
                <p className="text-sm text-gray-600">אושרו</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}