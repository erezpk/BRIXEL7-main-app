import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { type Task, type User, type Project } from '@shared/schema';
import { Clock, AlertTriangle, Calendar, User as UserIcon, Edit, Trash2, Play, Pause, RotateCcw, Timer } from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

interface TaskCardProps {
  task: Task;
  users: User[];
  projects: Project[];
  onEdit?: (task: Task) => void;
  onDelete?: (taskId: string) => void;
  isTableView?: boolean;
  isSelected?: boolean;
  onSelect?: (taskId: string, selected: boolean) => void;
  onTaskTimer?: (taskId: string, action: 'start' | 'pause' | 'stop') => void;
  activeTimers?: Record<string, number>;
}

interface TimeEntry {
  id: string;
  startTime: number;
  endTime?: number;
  duration?: number;
}

const PRIORITY_COLORS = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-red-100 text-red-800',
  urgent: 'bg-red-100 text-red-800',
} as const;

const PRIORITY_LABELS = {
  low: 'נמוכה',
  medium: 'בינונית',
  high: 'גבוהה',
  urgent: 'דחופה',
} as const;

export function TaskCard({ task, users, projects, onEdit, onDelete, isTableView = false, isSelected = false, onSelect, onTaskTimer, activeTimers = {} }: TaskCardProps) {
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([
    // Mock data - in real app this would come from backend
    {
      id: '1',
      startTime: Date.now() - 3600000,
      endTime: Date.now() - 1800000,
      duration: 1800000
    },
    {
      id: '2',
      startTime: Date.now() - 1200000,
      endTime: Date.now() - 600000,
      duration: 600000
    }
  ]);

  const assignedUser = users.find(user => user.id === task.assignedTo);
  const project = projects.find(p => p.id === task.projectId);

  const isActive = activeTimers[task.id];
  const isCompleted = task.status === 'completed';

  const handleTimerAction = (action: 'start' | 'pause' | 'stop') => {
    if (action === 'start') {
      const startTime = Date.now();
      setTimeEntries(prev => [...prev, {
        id: Date.now().toString(),
        startTime,
      }]);
    } else if (action === 'stop') {
      setTimeEntries(prev => prev.map(entry => 
        !entry.endTime ? {
          ...entry,
          endTime: Date.now(),
          duration: Date.now() - entry.startTime
        } : entry
      ));
    }
    onTaskTimer?.(task.id, action);
  };

  const formatDuration = (duration: number) => {
    const hours = Math.floor(duration / 3600000);
    const minutes = Math.floor((duration % 3600000) / 60000);
    return `${hours}:${minutes.toString().padStart(2, '0')}`;
  };

  const formatActiveTimer = (startTime: number) => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const getTotalTime = () => {
    const completedTime = timeEntries
      .filter(entry => entry.duration)
      .reduce((total, entry) => total + (entry.duration || 0), 0);

    const activeTime = isActive ? Date.now() - isActive : 0;
    return completedTime + activeTime;
  };

  return (
    <>
      <Card 
        className="hover:shadow-md transition-shadow cursor-pointer" 
        onClick={() => setShowTimeModal(true)}
      >
        <CardContent className="p-4">
          <div className="space-y-3">
            {/* Table view selection and actions */}
            {isTableView && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) => onSelect?.(task.id, !!checked)}
                  />
                </div>
                <div className="flex items-center gap-1">
                  {onEdit && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(task);
                      }}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                  {onDelete && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(task.id);
                      }}
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Kanban view actions */}
            {!isTableView && (onEdit || onDelete) && (
              <div className="flex justify-end gap-1">
                {onEdit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(task);
                    }}
                    className="h-6 w-6 p-0"
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                )}
                {onDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(task.id);
                    }}
                    className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            )}

            {/* Title */}
            <h4 className="font-medium text-sm text-right leading-tight">
              {task.title}
            </h4>

            {/* Description */}
            {task.description && (
              <p className="text-xs text-muted-foreground text-right line-clamp-2">
                {task.description}
              </p>
            )}

            {/* Project */}
            {project && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                  {project.name}
                </span>
              </div>
            )}

            {/* Priority */}
            <div className="flex items-center justify-between">
              <Badge 
                className={`text-xs ${PRIORITY_COLORS[task.priority as keyof typeof PRIORITY_COLORS]}`}
                variant="secondary"
              >
                {PRIORITY_LABELS[task.priority as keyof typeof PRIORITY_LABELS]}
              </Badge>

              {/* Assigned user */}
              {assignedUser && (
                <div className="flex items-center gap-1">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={assignedUser.avatar || ''} />
                    <AvatarFallback className="text-xs">
                      {assignedUser.fullName?.split(' ').map(n => n[0]).join('') || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-muted-foreground">
                    {assignedUser.fullName?.split(' ')[0] || 'משתמש'}
                  </span>
                </div>
              )}
            </div>

            {/* Due date */}
            {task.dueDate && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>
                  {format(new Date(task.dueDate), 'dd/MM/yyyy', { locale: he })}
                </span>
              </div>
            )}

            {/* Time tracking */}
            <div className="flex items-center justify-between gap-2">
              {task.estimatedHours && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>{task.estimatedHours} שעות משוערות</span>
                </div>
              )}

              
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Time Tracking Modal */}
      <Dialog open={showTimeModal} onOpenChange={setShowTimeModal}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-right font-rubik text-lg">{task.title}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Task Description with Clear Action */}
            <div className="bg-blue-50 p-3 rounded-lg border-l-4 border-blue-400">
              <div className="text-right">
                <p className="font-medium text-blue-900 mb-1">מה צריך לעשות?</p>
                <p className="text-blue-800 text-sm">
                  {task.description || "לא הוגדר תיאור מפורט למשימה זו"}
                </p>
              </div>
            </div>

            {/* Assigned and Related Info - Compact */}
            <div className="grid grid-cols-1 gap-2 text-sm">
              {assignedUser && (
                <div className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded">
                  <span className="text-gray-600">אחראי:</span>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={assignedUser.avatar || ''} />
                      <AvatarFallback className="text-xs">
                        {assignedUser.fullName?.split(' ').map(n => n[0]).join('') || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{assignedUser.fullName}</span>
                  </div>
                </div>
              )}
              
              {project && (
                <div className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded">
                  <span className="text-gray-600">פרויקט:</span>
                  <span className="font-medium">{project.name}</span>
                </div>
              )}

              {task.leadId && (
                <div className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded">
                  <span className="text-gray-600">ליד:</span>
                  <span className="font-medium">#{task.leadId.slice(-6)}</span>
                </div>
              )}
            </div>

            {/* Time Status - Minimalistic */}
            <div className="bg-white border rounded-lg p-3">
              <div className="flex items-center justify-between mb-3">
                <Badge className={`text-xs ${PRIORITY_COLORS[task.priority as keyof typeof PRIORITY_COLORS]}`}>
                  עדיפות {PRIORITY_LABELS[task.priority as keyof typeof PRIORITY_LABELS]}
                </Badge>
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-600">{formatDuration(getTotalTime())}</div>
                  {task.estimatedHours && (
                    <div className="text-xs text-gray-500">מתוך {task.estimatedHours} שעות</div>
                  )}
                </div>
              </div>

              {/* Timer Controls - Simplified */}
              {!isCompleted && (
                <div className="flex justify-center">
                  {isActive ? (
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-800 px-4 py-2 rounded-full">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="font-mono text-lg font-bold">{formatActiveTimer(isActive)}</span>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => handleTimerAction('stop')}
                        size="sm"
                        className="rounded-full px-4"
                      >
                        עצור
                      </Button>
                    </div>
                  ) : (
                    <Button
                      onClick={() => handleTimerAction('start')}
                      className="bg-green-600 hover:bg-green-700 rounded-full px-6 py-2"
                    >
                      <Play className="h-4 w-4 ml-2" />
                      התחל משימה
                    </Button>
                  )}
                </div>
              )}

              {isCompleted && (
                <div className="text-center">
                  <Badge className="bg-green-100 text-green-800 px-3 py-1">
                    ✅ הושלם
                  </Badge>
                </div>
              )}
            </div>

            {/* Time History - Minimalistic */}
            {timeEntries.length > 0 && (
              <div>
                <h3 className="font-medium text-right mb-2 text-sm text-gray-600">היסטוריה</h3>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {timeEntries.map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs">
                      <div className="text-right">
                        <span className="text-gray-600">
                          {format(new Date(entry.startTime), 'dd/MM/yyyy', { locale: he })}
                        </span>
                        {entry.endTime && (
                          <span className="text-gray-500 mr-2">
                            {format(new Date(entry.startTime), 'HH:mm', { locale: he })}-{format(new Date(entry.endTime), 'HH:mm', { locale: he })}
                          </span>
                        )}
                      </div>
                      <div>
                        {entry.duration ? (
                          <span className="font-mono font-medium text-blue-600">
                            {formatDuration(entry.duration)}
                          </span>
                        ) : (
                          <span className="text-green-600 font-medium">
                            פעיל
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}