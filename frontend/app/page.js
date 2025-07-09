"use client";
import { useState, useEffect, useMemo } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const HARDCODED_EMAIL = "manager1@company.com";
const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:5000";

// Convert YYYY-MM-DD to MM/DD/YYYY
function toMMDDYYYY(dateStr) {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return "";
  const [yyyy, mm, dd] = dateStr.split("-");
  return `${mm}/${dd}/${yyyy}`;
}

// Convert MM/DD/YYYY to YYYY-MM-DD
function toYYYYMMDDfromMMDD(dateStr) {
  if (!dateStr || !/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) return "";
  const [mm, dd, yyyy] = dateStr.split("/");
  return `${yyyy}-${mm}-${dd}`;
}

// Validate date string
function isValidDate(dateStr) {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const date = new Date(dateStr);
  return !isNaN(date.getTime());
}

// Normalize time to HH:MM
function normalizeTime(timeStr) {
  if (!timeStr) return "";
  return timeStr.split(":").slice(0, 2).join(":");
}

// Format total hours
function formatTotalHours(total) {
  if (!total) return "0:00";
  const parts = total.split(":");
  return `${parseInt(parts[0], 10)}:${parts[1]}`;
}

// Get the next Monday's date in YYYY-MM-DD format
function getNextMonday() {
  const today = new Date();
  const day = today.getDay();
  const daysUntilMonday = day === 0 ? 1 : 8 - day;
  const nextMonday = new Date(today);
  nextMonday.setDate(today.getDate() + daysUntilMonday);
  return nextMonday.toISOString().split("T")[0];
}

// Tree-like hierarchy component
const HierarchyTree = ({ hierarchy, currentEmployee }) => {
  const fullHierarchy = [...hierarchy].reverse().concat([currentEmployee]);
  return (
    <div className="flex flex-col items-center space-y-2">
      {fullHierarchy.length > 0 ? (
        fullHierarchy.map((person, index) => (
          <div key={person.id} className="flex flex-col items-center">
            <span className="text-lg">
              {person.email === currentEmployee.email ? "👤 " : ""}
              {person.employee_name}
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

export default function Home() {
  const [employee, setEmployee] = useState(null);
  const [managerHierarchy, setManagerHierarchy] = useState([]);
  const [dailyLogs, setDailyLogs] = useState([]);
  const [editedLogs, setEditedLogs] = useState({});
  const [weekStarting, setWeekStarting] = useState(getNextMonday());
  const [loading, setLoading] = useState(false);
  const [showChangeHistory, setShowChangeHistory] = useState(false);
  const [selectedLogId, setSelectedLogId] = useState(null);
  const [logChanges, setLogChanges] = useState([]);
  const [timesheetId, setTimesheetId] = useState(null);

  // Memoize week dates
  const weekDates = useMemo(() => {
    if (!weekStarting || !isValidDate(weekStarting)) return [];
    const startDate = new Date(weekStarting);
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      return {
        date: date.toISOString().split("T")[0],
        day: date.toLocaleString("en-US", { weekday: "long" }),
      };
    });
  }, [weekStarting]);

  // Initialize empty logs for the current week on mount
  useEffect(() => {
    const initializeEmptyLogs = () => {
      const logsMap = {};
      weekDates.forEach((day) => {
        const dateKey = toMMDDYYYY(day.date);
        logsMap[dateKey] = {
          id: `temp-${Date.now()}-${dateKey}`,
          time_in_am: "",
          time_out_am: "",
          time_in_pm: "",
          time_out_pm: "",
          description: "",
          total_hours: "0:00",
          date: dateKey,
        };
      });
      setEditedLogs(logsMap);
    };
    initializeEmptyLogs();
  }, [weekDates]);

  // Fetch employee and hierarchy on mount
  useEffect(() => {
    const fetchProfileWithHierarchy = async () => {
      setLoading(true);
      try {
        console.log("Fetching employee profile for:", HARDCODED_EMAIL);
        const url = `${BASE_URL}/api/employees/profile-with-hierarchy?email=${encodeURIComponent(HARDCODED_EMAIL)}`;
        const response = await fetch(url, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        });
        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || `HTTP error ${response.status}`);
        }
        const data = await response.json();
        console.log("Employee data fetched:", data);
        setEmployee(data.employee);
        setManagerHierarchy(data.manager_hierarchy || []);
      } catch (error) {
        console.error("Error fetching profile:", error);
        setEmployee(null);
        setManagerHierarchy([]);
        toast.error(`Error fetching data: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };
    fetchProfileWithHierarchy();
  }, []);

  // Save week: check/create timesheet, fetch logs
  const handleSaveWeek = async () => {
    if (!employee?.employee_name || !isValidDate(weekStarting)) {
      toast.error("Please select a valid week starting date.");
      return;
    }
    setLoading(true);
    try {
      console.log("Checking/creating timesheet for week:", weekStarting);
      const checkUrl = `${BASE_URL}/api/timesheets/by-employee-name-week?employee_name=${encodeURIComponent(employee.employee_name)}&week_starting=${encodeURIComponent(weekStarting)}`;
      let timesheetRes = await fetch(checkUrl, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });

      let timesheet;
      if (timesheetRes.ok) {
        timesheet = await timesheetRes.json();
        setTimesheetId(timesheet.id);
        console.log("Timesheet found:", timesheet);
        toast.info("Week already exists. Showing records.");
      } else if (timesheetRes.status === 404) {
        console.log("Creating new timesheet");
        const createRes = await fetch(`${BASE_URL}/api/timesheets`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            employee_name: employee.employee_name,
            week_starting: weekStarting,
          }),
        });
        if (!createRes.ok) {
          const err = await createRes.json();
          throw new Error(err.error || "Failed to save week starting date.");
        }
        timesheet = await createRes.json();
        setTimesheetId(timesheet.id);
        console.log("Timesheet created:", timesheet);
        toast.success("Week starting date saved successfully!");
      } else {
        const err = await timesheetRes.json();
        throw new Error(err.error || "Failed to fetch timesheet.");
      }

      // Fetch daily logs
      const logsUrl = `${BASE_URL}/api/daily-logs?timesheet_id=${timesheet.id}`;
      console.log("Fetching logs for timesheet_id:", timesheet.id);
      const logsRes = await fetch(logsUrl, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });
      let logsData = [];
      if (logsRes.ok) {
        logsData = await logsRes.json();
      } else {
        console.error("Failed to fetch logs:", await logsRes.json());
      }
      console.log("Logs fetched:", logsData);
      setDailyLogs(logsData);

      // Update logs map with fetched data
      const logsMap = {};
      logsData.forEach((log) => {
        const dateKey = toMMDDYYYY(log.log_date);
        if (dateKey) {
          logsMap[dateKey] = {
            id: log.id,
            time_in_am: normalizeTime(log.morning_in) || "",
            time_out_am: normalizeTime(log.morning_out) || "",
            time_in_pm: normalizeTime(log.afternoon_in) || "",
            time_out_pm: normalizeTime(log.afternoon_out) || "",
            description: log.description || "",
            total_hours: formatTotalHours(log.total_hours) || "0:00",
            date: dateKey,
          };
        }
      });
      weekDates.forEach((day) => {
        const dateKey = toMMDDYYYY(day.date);
        if (!logsMap[dateKey]) {
          logsMap[dateKey] = {
            id: `temp-${Date.now()}-${dateKey}`,
            time_in_am: "",
            time_out_am: "",
            time_in_pm: "",
            time_out_pm: "",
            description: "",
            total_hours: "0:00",
            date: dateKey,
          };
        }
      });
      setEditedLogs(logsMap);
      console.log("Logs map set:", logsMap);
    } catch (error) {
      console.error("Error saving week:", error);
      toast.error(`Error saving week: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Calculate total hours
  const calculateTotalHours = (log) => {
    const parseTime = (time) => {
      if (!time) return 0;
      let [hours, minutes] = time.split(":").map(Number);
      if (isNaN(hours) || isNaN(minutes)) return 0;
      return hours * 60 + minutes;
    };

    let totalMinutes = 0;
    if (log.time_in_am && log.time_out_am) {
      const inMinutes = parseTime(log.time_in_am);
      const outMinutes = parseTime(log.time_out_am);
      if (outMinutes > inMinutes) totalMinutes += outMinutes - inMinutes;
    }
    if (log.time_in_pm && log.time_out_pm) {
      const inMinutes = parseTime(log.time_in_pm);
      const outMinutes = parseTime(log.time_out_pm);
      if (outMinutes > inMinutes) totalMinutes += outMinutes - inMinutes;
    }
    if (totalMinutes < 0) return "0:00";
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}:${minutes.toString().padStart(2, "0")}`;
  };

  // Handle time input focus
  const handleTimeInputFocus = (dateKey, field) => {
    setEditedLogs((prev) => {
      const currentLog = prev[dateKey] || {};
      if (!currentLog[field]) {
        const updatedLog = { ...currentLog };
        switch (field) {
          case "time_in_am":
            updatedLog.time_in_am = "08:00";
            break;
          case "time_out_am":
            updatedLog.time_out_am = "12:00";
            break;
          case "time_in_pm":
            updatedLog.time_in_pm = "13:00";
            break;
          case "time_out_pm":
            updatedLog.time_out_pm = "17:00";
            break;
          default:
            break;
        }
        updatedLog.total_hours = calculateTotalHours(updatedLog);
        return { ...prev, [dateKey]: updatedLog };
      }
      return prev;
    });
  };

  // Handle time input changes
  const handleTimeChange = (dateKey, field, value) => {
    setEditedLogs((prev) => {
      const updatedLog = { ...prev[dateKey], [field]: normalizeTime(value) };
      updatedLog.total_hours = calculateTotalHours(updatedLog);
      return { ...prev, [dateKey]: updatedLog };
    });
  };

  // Handle description changes
  const handleDescriptionChange = (dateKey, value) => {
    setEditedLogs((prev) => ({
      ...prev,
      [dateKey]: { ...prev[dateKey], description: value },
    }));
  };

  // Save individual log
  const handleSaveLog = async (dateKey) => {
    console.log("handleSaveLog called with dateKey:", dateKey);
    const log = editedLogs[dateKey];
    if (!log) {
      console.error("No log found for dateKey:", dateKey);
      toast.error("No log data available for this date.");
      return;
    }
    if (!employee?.id) {
      console.error("Employee ID missing:", employee);
      toast.error("Employee data not available.");
      return;
    }
    if (!timesheetId) {
      console.error("Timesheet ID missing:", timesheetId);
      toast.error("Timesheet not selected. Please save the week first.");
      return;
    }
    const logDate = toYYYYMMDDfromMMDD(dateKey);
    if (!isValidDate(logDate)) {
      console.error("Invalid log_date:", logDate);
      toast.error("Invalid date format for log.");
      return;
    }

    setLoading(true);
    try {
      let logId = log.id;
      let isNewLog = typeof logId === "string" && logId.startsWith("temp-");
      const existingLog = dailyLogs.find((l) => toMMDDYYYY(l.log_date) === dateKey);
      if (existingLog) {
        logId = existingLog.id;
        isNewLog = false;
        console.log("Existing log found in dailyLogs:", existingLog);
        toast.info("Log already exists. Updating instead.");
      }

      const payload = {
        timesheet_id: timesheetId,
        log_date: logDate,
        morning_in: normalizeTime(log.time_in_am) || null,
        morning_out: normalizeTime(log.time_out_am) || null,
        afternoon_in: normalizeTime(log.time_in_pm) || null,
        afternoon_out: normalizeTime(log.time_out_pm) || null,
        description: log.description || "",
        total_hours: calculateTotalHours(log),
      };
      console.log("Sending payload:", payload);

      let res;
      if (isNewLog) {
        console.log("Creating new log");
        res = await fetch(`${BASE_URL}/api/daily-logs`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        console.log("Updating log with ID:", logId);
        res = await fetch(`${BASE_URL}/api/daily-logs/${logId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const err = await res.json();
        console.error("API error:", err);
        throw new Error(err.error || `Failed to ${isNewLog ? "create" : "update"} daily log.`);
      }

      if (!isNewLog && existingLog && log.description && log.description !== existingLog.description) {
        console.log("Checking for existing description changes for log ID:", logId);
        const changesRes = await fetch(`${BASE_URL}/api/daily-logs/${logId}/changes`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        });
        let existingChanges = [];
        if (changesRes.ok) {
          existingChanges = await changesRes.json();
        }
        if (existingChanges.length === 0) {
          console.log("No prior changes found. Recording first description change for log ID:", logId);
          await fetch(`${BASE_URL}/api/daily-log-changes`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              daily_log_id: logId,
              new_description: log.description,
            }),
          });
          console.log("First description change recorded");
        } else {
          console.log("Changes already exist for log ID:", logId, existingChanges);
        }
      }

      toast.success("Log saved successfully!");
      console.log("Log saved successfully");

      // Refetch logs
      const logsUrl = `${BASE_URL}/api/daily-logs?timesheet_id=${timesheetId}`;
      console.log("Refetching logs:", logsUrl);
      const logsRes = await fetch(logsUrl, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });
      let logsData = [];
      if (logsRes.ok) {
        logsData = await logsRes.json();
      } else {
        console.error("Failed to fetch logs:", await logsRes.json());
      }
      setDailyLogs(logsData);

      const logsMap = {};
      logsData.forEach((log) => {
        const dateKey = toMMDDYYYY(log.log_date);
        if (dateKey) {
          logsMap[dateKey] = {
            id: log.id,
            time_in_am: normalizeTime(log.morning_in) || "",
            time_out_am: normalizeTime(log.morning_out) || "",
            time_in_pm: normalizeTime(log.afternoon_in) || "",
            time_out_pm: normalizeTime(log.afternoon_out) || "",
            description: log.description || "",
            total_hours: formatTotalHours(log.total_hours) || "0:00",
            date: dateKey,
          };
        }
      });
      weekDates.forEach((day) => {
        const dateKey = toMMDDYYYY(day.date);
        if (!logsMap[dateKey]) {
          logsMap[dateKey] = {
            id: `temp-${Date.now()}-${dateKey}`,
            time_in_am: "",
            time_out_am: "",
            time_in_pm: "",
            time_out_pm: "",
            description: "",
            total_hours: "0:00",
            date: dateKey,
          };
        }
      });
      setEditedLogs(logsMap);
      console.log("Updated logs map:", logsMap);
    } catch (error) {
      console.error("Error in handleSaveLog:", error);
      if (error.message.includes("Failed to fetch")) {
        toast.error("Unable to connect to the backend. Is the server running at " + BASE_URL + "?");
      } else {
        toast.error(`Error saving log: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch log changes
  const fetchLogChanges = async (logId) => {
    console.log("Fetching changes for log ID:", logId);
    try {
      const response = await fetch(`${BASE_URL}/api/daily-logs/${logId}/changes`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || `HTTP error ${response.status}`);
      }
      const data = await response.json();
      setLogChanges(data);
    } catch (error) {
      console.error("Error fetching changes:", error);
      toast.error(`Error fetching changes: ${error.message}`);
      setLogChanges([]);
    }
  };

  // Reset logChanges when dialog closes
  useEffect(() => {
    if (!showChangeHistory) {
      setLogChanges([]);
      setSelectedLogId(null);
    }
  }, [showChangeHistory]);

  return (
    <div className="container mx-auto p-4">
      <Card className="w-full">
        <CardHeader className="bg-blue-100 text-center py-4">
          <CardTitle className="text-2xl font-bold">
            Time Sheet for Employees
          </CardTitle>
        </CardHeader>
        <CardContent>
          <h2 className="text-xl font-bold mb-4">Employee Info</h2>
          {loading ? (
            <div>Loading...</div>
          ) : employee ? (
            <div className="grid grid-cols-2 gap-4 mb-4">
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
                <Label htmlFor="reports-to">Reports To (ID)</Label>
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
              <h2 className="text-xl font-bold mt-8 mb-4">Timesheet and Logs</h2>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <Label htmlFor="manager-name">Manager Name</Label>
                  <Input
                    id="manager-name"
                    value={
                      managerHierarchy.length > 0
                        ? managerHierarchy[0].employee_name
                        : "No manager"
                    }
                    readOnly
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="week-starting">Week Starting</Label>
                  <div className="flex space-x-2">
                    <Input
                      id="week-starting"
                      type="date"
                      value={weekStarting || ""}
                      onChange={(e) => setWeekStarting(e.target.value)}
                      className="mt-1"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSaveWeek}
                      disabled={loading || !weekStarting}
                    >
                      Save Week
                    </Button>
                  </div>
                </div>
              </div>

              {weekDates.length > 0 && (
                loading ? (
                  <div>Loading...</div>
                ) : (
                  <div className="w-full overflow-auto">
                    <Table>
                      <TableHeader className="bg-blue-100">
                        <TableRow>
                          <TableHead className="border">Date</TableHead>
                          <TableHead className="border">Day</TableHead>
                          <TableHead className="border">Morning In (AM)</TableHead>
                          <TableHead className="border">Morning Out (AM)</TableHead>
                          <TableHead className="border">Afternoon In (PM)</TableHead>
                          <TableHead className="border">Afternoon Out (PM)</TableHead>
                          <TableHead className="border">Description</TableHead>
                          <TableHead className="border">Total Hours</TableHead>
                          <TableHead className="border">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {weekDates.map((day, index) => {
                          const dateKey = toMMDDYYYY(day.date);
                          const log = editedLogs[dateKey] || {};
                          const isOddRow = index % 2 === 0;
                          return (
                            <TableRow
                              key={dateKey}
                              className={isOddRow ? "bg-gray-50" : "bg-white"}
                            >
                              <TableCell className="border">{dateKey}</TableCell>
                              <TableCell className="border">{day.day}</TableCell>
                              <TableCell className="border">
                                <Input
                                  type="time"
                                  value={log.time_in_am || ""}
                                  onChange={(e) =>
                                    handleTimeChange(dateKey, "time_in_am", e.target.value)
                                  }
                                  onFocus={() => handleTimeInputFocus(dateKey, "time_in_am")}
                                />
                              </TableCell>
                              <TableCell className="border">
                                <Input
                                  type="time"
                                  value={log.time_out_am || ""}
                                  onChange={(e) =>
                                    handleTimeChange(dateKey, "time_out_am", e.target.value)
                                  }
                                  onFocus={() => handleTimeInputFocus(dateKey, "time_out_am")}
                                />
                              </TableCell>
                              <TableCell className="border">
                                <Input
                                  type="time"
                                  value={log.time_in_pm || ""}
                                  onChange={(e) =>
                                    handleTimeChange(dateKey, "time_in_pm", e.target.value)
                                  }
                                  onFocus={() => handleTimeInputFocus(dateKey, "time_in_pm")}
                                />
                              </TableCell>
                              <TableCell className="border">
                                <Input
                                  type="time"
                                  value={log.time_out_pm || ""}
                                  onChange={(e) =>
                                    handleTimeChange(dateKey, "time_out_pm", e.target.value)
                                  }
                                  onFocus={() => handleTimeInputFocus(dateKey, "time_out_pm")}
                                />
                              </TableCell>
                              <TableCell className="border">
                                <Input
                                  value={log.description || ""}
                                  onChange={(e) => handleDescriptionChange(dateKey, e.target.value)}
                                />
                              </TableCell>
                              <TableCell className="border">
                                {formatTotalHours(log.total_hours) || "0:00"}
                              </TableCell>
                              <TableCell className="border">
                                <div className="space-x-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleSaveLog(dateKey)}
                                    disabled={loading || !timesheetId}
                                  >
                                    Save
                                  </Button>
                                  <Dialog
                                    open={showChangeHistory && selectedLogId === log.id}
                                    onOpenChange={(open) => setShowChangeHistory(open)}
                                  >
                                    <DialogTrigger asChild>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          setSelectedLogId(log.id);
                                          setShowChangeHistory(true);
                                          if (log.id && !String(log.id).startsWith("temp-"))
                                            fetchLogChanges(log.id);
                                        }}
                                        disabled={!log.id || String(log.id).startsWith("temp-") || loading}
                                      >
                                        View Changes
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                      <DialogHeader>
                                        <DialogTitle>Change History for {dateKey}</DialogTitle>
                                      </DialogHeader>
                                      {logChanges.length > 0 ? (
                                        <Table>
                                          <TableHeader>
                                            <TableRow>
                                              <TableHead className="border">Description</TableHead>
                                              <TableHead className="border">Updated At</TableHead>
                                            </TableRow>
                                          </TableHeader>
                                          <TableBody>
                                            {logChanges.map((change, index) => (
                                              <TableRow
                                                key={change.id}
                                                className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}
                                              >
                                                <TableCell className="border">{change.new_description}</TableCell>
                                                <TableCell className="border text-sm">
                                                  {new Date(change.changed_at).toLocaleString("en-IN", {
                                                    timeZone: "Asia/Kolkata",
                                                  })}
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
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
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