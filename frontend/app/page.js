
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:5000";
const CURRENT_EMAIL = "robertfisher@example.org"; // Replace with auth context in production

function toYYYYMMDD(date) {
  if (!date) return "";
  const d = new Date(date);
  return d.toISOString().split("T")[0];
}

function isValidDate(dateStr) {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const date = new Date(dateStr);
  return !isNaN(date.getTime());
}

function isValidTime(timeStr) {
  if (!timeStr || !/^\d{2}:\d{2}$/.test(timeStr)) return false;
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60;
}

function normalizeTime(timeStr) {
  if (!timeStr) return "";
  return timeStr.split(":").slice(0, 2).join(":");
}

function calculateTotalHours(start, end) {
  if (!start || !end || !isValidTime(start) || !isValidTime(end)) return "0:00";
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let mins = (eh * 60 + em) - (sh * 60 + sm);
  if (mins < 0) mins += 24 * 60; // Handle overnight shifts
  if (mins === 0) return "0:00"; // Handle same start and end time
  const hours = Math.floor(mins / 60);
  const minutes = mins % 60;
  return `${hours}:${minutes.toString().padStart(2, "0")}`;
}

function getDayOfWeek(dateStr) {
  if (!isValidDate(dateStr)) return "";
  const date = new Date(dateStr);
  return date.toLocaleString("en-US", { weekday: "long" });
}

const HierarchyTree = ({ hierarchy, currentEmployee }) => {
  const fullHierarchy = [...(hierarchy || [])].reverse().concat([currentEmployee]);

  return (
    <div className="flex flex-col items-center space-y-2">
      {fullHierarchy.length > 0 ? (
        fullHierarchy.map((person, index) => (
          <div key={person.id || person.email || index} className="flex flex-col items-center">
            <span className="text-lg font-medium">
              {person.email === currentEmployee.email ? "👤 " : ""}
              {person.employee_name}
            </span>
            <span className="text-sm text-gray-900 italic">
              {person.designation?.title ||
                (person.email === currentEmployee.email
                  ? currentEmployee.designation?.title
                  : "No designation")}
            </span>
            {index < fullHierarchy.length - 1 && (
              <span className="text-gray-500 text-xl my-1">↑</span>
            )}
          </div>
        ))
      ) : (
        <div className="text-gray-500">No manager hierarchy available.</div>
      )}
    </div>
  );
};

const DailyLogChangesDialog = ({ open, onOpenChange, logId, projects }) => {
  const [changes, setChanges] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && logId && !String(logId).startsWith("temp-")) {
      setLoading(true);
      fetch(`${BASE_URL}/api/daily-logs/${logId}/changes`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      })
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => setChanges(data))
        .catch(() => setChanges([]))
        .finally(() => setLoading(false));
    } else {
      setChanges([]);
 рабо

System: Based on the error message and the provided code, the issue in your application stems from a mismatch in the `handleSaveLog` function where the `date` parameter is incorrectly passed as the entire `day` object instead of `day.date`. This causes the `logsForDay` lookup to fail, resulting in the "Log not found" error despite valid log data existing for the date "2025-07-07". Below, I’ve provided the corrected code, updating the `TimesheetTable` component call in the `Home` component to pass `day.date` instead of `day` to the `handleSaveLog` function. This change ensures that the `logsForDay` array is correctly accessed using the date string (e.g., "2025-07-07") as the key in the `logsByDay` object.

### Explanation of the Fix
- **Issue**: In the `TimesheetTable` component, the `handleSaveLog` prop is defined as:
  ```javascript
  handleSaveLog={(idx) => handleSaveLog(day, idx)}
  ```
  Here, `day` is an object `{ date: "2025-07-07", day: "Monday" }`, but the `handleSaveLog` function expects a string (the date, e.g., "2025-07-07"). This causes `logsByDay[date]` to be `logsByDay[{ date: "2025-07-07", day: "Monday" }]`, which is undefined, leading to the error.
- **Fix**: Change the prop to:
  ```javascript
  handleSaveLog={(idx) => handleSaveLog(day.date, idx)}
  ```
  This passes the `date` string directly, ensuring `logsByDay[date]` correctly retrieves the log array for the given date.

### Updated Code
Below is the full updated code with the correction applied. The change is specifically in the `TimesheetTable` component call within the `Home` component’s render method. The rest of the code, including the `console.error` statements from your latest version, is retained as per your previous request. The artifact ID remains the same, as this is an update to the existing code.

<xaiArtifact artifact_id="b13d23a0-4140-4a10-a7b3-f8832bb48829" artifact_version_id="8a6e0492-43af-4149-b6db-075b155bcad9" title="index.jsx" contentType="text/jsx">
```jsx
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:5000";
const CURRENT_EMAIL = "robertfisher@example.org"; // Replace with auth context in production

function toYYYYMMDD(date) {
  if (!date) return "";
  const d = new Date(date);
  return d.toISOString().split("T")[0];
}

function isValidDate(dateStr) {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const date = new Date(dateStr);
  return !isNaN(date.getTime());
}

function isValidTime(timeStr) {
  if (!timeStr || !/^\d{2}:\d{2}$/.test(timeStr)) return false;
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60;
}

function normalizeTime(timeStr) {
  if (!timeStr) return "";
  return timeStr.split(":").slice(0, 2).join(":");
}

function calculateTotalHours(start, end) {
  if (!start || !end || !isValidTime(start) || !isValidTime(end)) return "0:00";
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let mins = (eh * 60 + em) - (sh * 60 + sm);
  if (mins < 0) mins += 24 * 60; // Handle overnight shifts
  if (mins === 0) return "0:00"; // Handle same start and end time
  const hours = Math.floor(mins / 60);
  const minutes = mins % 60;
  return `${hours}:${minutes.toString().padStart(2, "0")}`;
}

function getDayOfWeek(dateStr) {
  if (!isValidDate(dateStr)) return "";
  const date = new Date(dateStr);
  return date.toLocaleString("en-US", { weekday: "long" });
}

const HierarchyTree = ({ hierarchy, currentEmployee }) => {
  const fullHierarchy = [...(hierarchy || [])].reverse().concat([currentEmployee]);

  return (
    <div className="flex flex-col items-center space-y-2">
      {fullHierarchy.length > 0 ? (
        fullHierarchy.map((person, index) => (
          <div key={person.id || person.email || index} className="flex flex-col items-center">
            <span className="text-lg font-medium">
              {person.email === currentEmployee.email ? "👤 " : ""}
              {person.employee_name}
            </span>
            <span className="text-sm text-gray-900 italic">
              {person.designation?.title ||
                (person.email === currentEmployee.email
                  ? currentEmployee.designation?.title
                  : "No designation")}
            </span>
            {index < fullHierarchy.length - 1 && (
              <span className="text-gray-500 text-xl my-1">↑</span>
            )}
          </div>
        ))
      ) : (
        <div className="text-gray-500">No manager hierarchy available.</div>
      )}
    </div>
  );
};

const DailyLogChangesDialog = ({ open, onOpenChange, logId, projects }) => {
  const [changes, setChanges] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && logId && !String(logId).startsWith("temp-")) {
      setLoading(true);
      fetch(`${BASE_URL}/api/daily-logs/${logId}/changes`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      })
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => setChanges(data))
        .catch(() => setChanges([]))
        .finally(() => setLoading(false));
    } else {
      setChanges([]);
    }
  }, [open, logId]);

  const getProjectName = (pid) => {
    const proj = projects.find((p) => String(p.id) === String(pid));
    return proj ? proj.name : "";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change History</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div>Loading...</div>
        ) : changes.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Changed At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {changes.map((change) => (
                <TableRow key={change.id}>
                  <TableCell>{getProjectName(change.project_id)}</TableCell>
                  <TableCell>{change.new_description}</TableCell>
                  <TableCell>
                    {new Date(change.changed_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-gray-500">No changes recorded.</div>
        )}
      </DialogContent>
    </Dialog>
  );
};

const TimesheetTable = ({
  day,
  logs,
  projects,
  loading,
  setLogsForDay,
  handleAddLogRow,
  handleRemoveLogRow,
  handleSaveLog,
  selectedLogId,
  setSelectedLogId,
  showChangeDialog,
  setShowChangeDialog,
}) => {
  const handleTimeChange = (idx, field, value) => {
    setLogsForDay((prev) => {
      const updated = [...prev];
      if (!updated[idx]) return prev;
      const newValue = normalizeTime(value);
      let start = updated[idx].start_time;
      let end = updated[idx].end_time;
      if (field === "start_time") start = newValue;
      if (field === "end_time") end = newValue;
      updated[idx] = {
        ...updated[idx],
        [field]: newValue,
        total_hours: calculateTotalHours(start, end),
      };
      return updated;
    });
  };

  const handleProjectChange = (idx, value) => {
    setLogsForDay((prev) => {
      const updated = [...prev];
      if (!updated[idx]) return prev;
      updated[idx] = { ...updated[idx], project_id: value };
      return updated;
    });
  };

  const handleDescriptionChange = (idx, value) => {
    setLogsForDay((prev) => {
      const updated = [...prev];
      if (!updated[idx]) return prev;
      updated[idx] = { ...updated[idx], description: value };
      return updated;
    });
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Project</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>Start Time</TableHead>
          <TableHead>End Time</TableHead>
          <TableHead>Total Hours</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {logs.map((log, idx) => (
          <TableRow key={log.id}>
            <TableCell>
              <Select
                value={log.project_id || ""}
                onValueChange={(value) => handleProjectChange(idx, value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((proj) => (
                    <SelectItem key={proj.id} value={proj.id.toString()}>
                      {proj.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </TableCell>
            <TableCell>
              <textarea
                className="w-full border rounded p-2 min-h-[48px] resize-vertical"
                value={log.description || ""}
                onChange={(e) => handleDescriptionChange(idx, e.target.value)}
                placeholder="Enter detailed description"
                rows={2}
              />
            </TableCell>
            <TableCell>
              <Input
                type="time"
                value={log.start_time || ""}
                onChange={(e) => handleTimeChange(idx, "start_time", e.target.value)}
              />
            </TableCell>
            <TableCell>
              <Input
                type="time"
                value={log.end_time || ""}
                onChange={(e) => handleTimeChange(idx, "end_time", e.target.value)}
              />
            </TableCell>
            <TableCell>{log.total_hours || "0:00"}</TableCell>
            <TableCell>
              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSaveLog(day.date, idx)}
                  disabled={loading || !log.project_id || !isValidTime(log.start_time) || !isValidTime(log.end_time)}
                >
                  Save
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedLogId(log.id);
                    setShowChangeDialog(true);
                  }}
                  disabled={!log.id || String(log.id).startsWith("temp-")}
                >
                  View Changes
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleRemoveLogRow(day.date, idx)}
                  disabled={logs.length === 1}
                >
                  Remove
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
        <TableRow>
          <TableCell colSpan={6} className="text-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAddLogRow(day.date)}
              disabled={loading}
            >
              + Add Entry
            </Button>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
};

export default function Home() {
  const [employee, setEmployee] = useState(null);
  const [managerHierarchy, setManagerHierarchy] = useState([]);
  const [department, setDepartment] = useState(null);
  const [designation, setDesignation] = useState(null);
  const [projects, setProjects] = useState([]);
  const [weekStart, setWeekStart] = useState(toYYYYMMDD(new Date()));
  const [weekEnd, setWeekEnd] = useState(toYYYYMMDD(new Date(Date.now() + 6 * 24 * 60 * 60 * 1000)));
  const [logsByDay, setLogsByDay] = useState({});
  const [timesheetId, setTimesheetId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedLogId, setSelectedLogId] = useState(null);
  const [showChangeDialog, setShowChangeDialog] = useState(false);

  const weekDates = useMemo(() => {
    if (!weekStart || !isValidDate(weekStart) || !weekEnd || !isValidDate(weekEnd)) return [];
    const start = new Date(weekStart);
    const end = new Date(weekEnd);
    const days = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      days.push({
        date: toYYYYMMDD(new Date(d)),
        day: getDayOfWeek(toYYYYMMDD(new Date(d))),
      });
    }
    return days;
  }, [weekStart, weekEnd]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const profileRes = await fetch(
          `${BASE_URL}/api/employees/profile-with-hierarchy?email=${encodeURIComponent(CURRENT_EMAIL)}`,
          { method: "GET", headers: { "Content-Type": "application/json" }, cache: "no-store" }
        );
        if (!profileRes.ok) throw new Error("Failed to fetch employee");
        const profileData = await profileRes.json();
        setEmployee(profileData.employee);
        setManagerHierarchy(profileData.manager_hierarchy || []);
        setDepartment(profileData.department || null);
        setDesignation(profileData.designation || null);

        const projectsRes = await fetch(`${BASE_URL}/api/projects`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        });
        if (!projectsRes.ok) throw new Error("Failed to fetch projects");
        setProjects(await projectsRes.json());
      } catch (error) {
        setEmployee(null);
        setManagerHierarchy([]);
        setDepartment(null);
        setDesignation(null);
        setProjects([]);
        toast.error(`Error fetching data: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const logs = {};
    weekDates.forEach((d) => {
      logs[d.date] = logsByDay[d.date]?.length > 0
        ? logsByDay[d.date]
        : [{
            id: `temp-${Date.now()}-${d.date}-0`,
            project_id: "",
            description: "",
            start_time: "",
            end_time: "",
            total_hours: "0:00",
            log_date: d.date,
          }];
    });
    setLogsByDay(logs);
  }, [weekDates]);

  const handleSaveWeek = async () => {
    if (!employee?.id || !isValidDate(weekStart) || !isValidDate(weekEnd)) {
      toast.error("Please select a valid week and ensure employee data is loaded.");
      return;
    }
    setLoading(true);
    try {
      const checkUrl = `${BASE_URL}/api/timesheets/by-employee-week?employee_id=${employee.id}&start_date=${weekStart}&end_date=${weekEnd}`;
      let timesheetRes = await fetch(checkUrl, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });

      let timesheet;
      if (timesheetRes.ok) {
        timesheet = await timesheetRes.json();
        setTimesheetId(timesheet.id);
        toast.info("Week already exists. Showing records.");
      } else if (timesheetRes.status === 404) {
        const createRes = await fetch(`${BASE_URL}/api/timesheets`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            employee_id: employee.id,
            start_date: weekStart,
            end_date: weekEnd,
          }),
        });
        if (!createRes.ok) throw new Error("Failed to save week.");
        timesheet = await createRes.json();
        setTimesheetId(timesheet.id);
        toast.success("Week saved successfully!");
      } else {
        throw new Error("Failed to fetch timesheet.");
      }

      const logsUrl = `${BASE_URL}/api/timesheets/${timesheet.id}/daily-logs`;
      const logsRes = await fetch(logsUrl, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });
      let logsData = [];
      if (logsRes.ok) logsData = await logsRes.json();

      const logsMap = {};
      weekDates.forEach((d) => (logsMap[d.date] = []));
      logsData.forEach((log) => {
        if (logsMap[log.log_date]) {
          logsMap[log.log_date].push({
            id: log.id,
            project_id: log.project_id?.toString() || "",
            description: log.task_description || "",
            start_time: log.start_time || "",
            end_time: log.end_time || "",
            total_hours: log.total_hours || "0:00",
            log_date: log.log_date,
          });
        }
      });
      weekDates.forEach((d) => {
        if (logsMap[d.date].length === 0) {
          logsMap[d.date].push({
            id: `temp-${Date.now()}-${d.date}-0`,
            project_id: "",
            description: "",
            start_time: "",
            end_time: "",
            total_hours: "0:00",
            log_date: d.date,
          });
        }
      });
      setLogsByDay(logsMap);
      console.log("Logs after saveWeek:", logsMap);
    } catch (error) {
      toast.error(`Error saving week: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveLog = async (date, idx) => {
    const logsForDay = logsByDay[date] || [];
    if (!Array.isArray(logsForDay) || idx < 0 || idx >= logsForDay.length) {
      toast.error(`Invalid log index ${idx} for date ${date}.`);
      return;
    }
    const log = logsForDay[idx];
    if (!log) {
      console.error("Log not found for", date, idx, logsForDay);
      toast.error("Log data not found.");
      return;
    }
    if (!employee?.id) {
      toast.error("Employee data not available.");
      return;
    }
    if (!timesheetId) {
      toast.error("Timesheet not selected. Please save the week first.");
      return;
    }
    if (!log.project_id || !isValidTime(log.start_time) || !isValidTime(log.end_time)) {
      toast.error("Please select a project and enter valid start and end times.");
      return;
    }
    const logDate = date;
    const payload = [
      {
        id: String(log.id).startsWith("temp-") ? null : log.id,
        timesheet_id: timesheetId,
        log_date: logDate,
        project_id: parseInt(log.project_id, 10),
        start_time: log.start_time,
        end_time: log.end_time,
        total_hours: calculateTotalHours(log.start_time, log.end_time),
        task_description: log.description || "",
      },
    ];
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/daily-logs/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to save daily log.");
      }
      toast.success("Log saved successfully!");

      const logsUrl = `${BASE_URL}/api/timesheets/${timesheetId}/daily-logs`;
      const logsRes = await fetch(logsUrl, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });
      if (!logsRes.ok) throw new Error("Failed to fetch logs.");
      const logsData = await logsRes.json();

      setLogsByDay((prev) => {
        const updated = { ...prev };
        updated[logDate] = logsData
          .filter((l) => l.log_date === logDate)
          .map((l) => ({
            id: l.id,
            project_id: l.project_id?.toString() || "",
            description: l.task_description || "",
            start_time: l.start_time || "",
            end_time: l.end_time || "",
            total_hours: l.total_hours || "0:00",
            log_date: l.log_date,
          }));
        if (updated[logDate].length === 0) {
          updated[logDate] = [
            {
              id: `temp-${Date.now()}-${logDate}-0`,
              project_id: "",
              description: "",
              start_time: "",
              end_time: "",
              total_hours: "0:00",
              log_date: logDate,
            },
          ];
        }
        return updated;
      });
    } catch (error) {
      toast.error(`Error saving log: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAddLogRow = (date) => {
    setLogsByDay((prev) => {
      const updated = { ...prev };
      updated[date] = [
        ...(updated[date] || []),
        {
          id: `temp-${Date.now()}-${date}-${(updated[date]?.length || 0)}`,
          project_id: "",
          description: "",
          start_time: "",
          end_time: "",
          total_hours: "0:00",
          log_date: date,
        },
      ];
      return updated;
    });
  };

  const handleRemoveLogRow = async (date, idx) => {
    const logsForDay = logsByDay[date] || [];
    if (!Array.isArray(logsForDay) || idx < 0 || idx >= logsForDay.length) {
      toast.error(`Invalid log index ${idx} for date ${date}.`);
      return;
    }
    const log = logsForDay[idx];
    if (!log) {
      console.error("Log not found for", date, idx, logsForDay);
      toast.error("Log data not found.");
      return;
    }

    if (!String(log.id).startsWith("temp-")) {
      setLoading(true);
      try {
        const res = await fetch(`${BASE_URL}/api/daily-logs/${log.id}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
        });
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.message || "Failed to delete log.");
        }
        toast.success("Log deleted successfully!");
      } catch (error) {
        toast.error(`Error deleting log: ${error.message}`);
        setLoading(false);
        return;
      }
    }

    setLogsByDay((prev) => {
      const updated = { ...prev };
      updated[date] = updated[date].filter((_, i) => i !== idx);
      if (!updated[date] || updated[date].length === 0) {
        updated[date] = [
          {
            id: `temp-${Date.now()}-${date}-0`,
            project_id: "",
            description: "",
            start_time: "",
            end_time: "",
            total_hours: "0:00",
            log_date: date,
          },
        ];
      }
      return updated;
    });
    setLoading(false);
  };

  return (
    <div className="container mx-auto p-4">
      <ToastContainer />
      <Card className="w-full">
        <CardHeader className="bg-blue-100 text-center py-4">
          <CardTitle className="text-2xl font-bold">
            Time Sheet for Employees (Weekly)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <h2 className="text-xl font-bold mb-4">Employee Info</h2>
          {loading ? (
            <div>Loading...</div>
          ) : employee ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <Label htmlFor="employee-name">Name</Label>
                <Input
                  id="employee-name"
                  value={employee.employee_name || ""}
                  readOnly
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="employee-email">Email</Label>
                <Input
                  id="employee-email"
                  value={employee.email || ""}
                  readOnly
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="employee-department">Department</Label>
                <Input
                  id="employee-department"
                  value={department?.name || "No department"}
                  readOnly
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="employee-designation">Designation</Label>
                <Input
                  id="employee-designation"
                  value={designation?.title || "No designation"}
                  readOnly
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="reports-to">Reports To</Label>
                <Input
                  id="reports-to"
                  value={employee.reports_to || "No manager"}
                  readOnly
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-lg font-semibold">Manager Hierarchy</Label>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="mt-2">
                      Show Hierarchy
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Manager Hierarchy</DialogTitle>
                    </DialogHeader>
                    <HierarchyTree
                      hierarchy={managerHierarchy}
                      currentEmployee={employee}
                    />
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          ) : (
            <div>Employee not found.</div>
          )}

          {employee && (
            <>
              <h2 className="text-xl font-bold mt-8 mb-4">Timesheet and Logs (Weekly)</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <Label htmlFor="week-start">Week Start</Label>
                  <Input
                    id="week-start"
                    type="date"
                    value={weekStart}
                    onChange={(e) => setWeekStart(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="week-end">Week End</Label>
                  <Input
                    id="week-end"
                    type="date"
                    value={weekEnd}
                    onChange={(e) => setWeekEnd(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSaveWeek}
                    disabled={loading || !weekStart || !weekEnd}
                  >
                    Load/Save Week
                  </Button>
                </div>
              </div>

              {weekDates.length > 0 && (
                loading ? (
                  <div>Loading...</div>
                ) : (
                  <div>
                    {weekDates.map((day) => (
                      <div key={day.date} className="mb-8">
                        <h3 className="font-semibold mb-2">
                          {day.date} ({day.day})
                        </h3>
                        <TimesheetTable
                          day={day}
                          logs={logsByDay[day.date] || []}
                          projects={projects}
                          loading={loading}
                          setLogsForDay={(fn) =>
                            setLogsByDay((prev) => ({
                              ...prev,
                              [day.date]: fn(prev[day.date] || []),
                            }))
                          }
                          handleAddLogRow={() => handleAddLogRow(day.date)}
                          handleRemoveLogRow={(idx) => handleRemoveLogRow(day.date, idx)}
                          handleSaveLog={(idx) => handleSaveLog(day.date, idx)}
                          selectedLogId={selectedLogId}
                          setSelectedLogId={setSelectedLogId}
                          showChangeDialog={showChangeDialog}
                          setShowChangeDialog={setShowChangeDialog}
                        />
                        <DailyLogChangesDialog
                          open={showChangeDialog}
                          onOpenChange={setShowChangeDialog}
                          logId={selectedLogId}
                          projects={projects}
                        />
                      </div>
                    ))}
                  </div>
                )
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
