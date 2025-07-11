"use client";
import { useState, useEffect, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const HARDCODED_EMAIL = "employee36@company.com";
const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:5000";

// Utility Functions
function toMMDDYYYY(dateStr) {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return "";
  const [yyyy, mm, dd] = dateStr.split("-");
  return `${mm}/${dd}/${yyyy}`;
}
function toYYYYMMDDfromMMDD(dateStr) {
  if (!dateStr || !/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) return "";
  const [mm, dd, yyyy] = dateStr.split("/");
  return `${yyyy}-${mm}-${dd}`;
}
function isValidDate(dateStr) {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const date = new Date(dateStr);
  return !isNaN(date.getTime());
}
function normalizeTime(timeStr) {
  if (!timeStr) return "";
  return timeStr.split(":").slice(0, 2).join(":");
}
function calculateTotalHours(log) {
  if (!log.start_time || !log.end_time) return "0:00";
  const parseTime = (time) => {
    let [hours, minutes] = time.split(":").map(Number);
    if (isNaN(hours) || isNaN(minutes)) return 0;
    return hours * 60 + minutes;
  };
  let totalMinutes = parseTime(log.end_time) - parseTime(log.start_time);
  if (totalMinutes < 0) totalMinutes += 24 * 60; // Handle overnight
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}:${minutes.toString().padStart(2, "0")}`;
}
function getNextMonday() {
  const today = new Date();
  const day = today.getDay();
  const daysUntilMonday = day === 0 ? 1 : 8 - day;
  const nextMonday = new Date(today);
  nextMonday.setDate(today.getDate() + daysUntilMonday);
  return nextMonday.toISOString().split("T")[0];
}

// HierarchyTree Component (unchanged)
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
  const [projects, setProjects] = useState([]);
  const [dailyLogs, setDailyLogs] = useState([]);
  const [editedLogs, setEditedLogs] = useState({});
  const [weekStarting, setWeekStarting] = useState(getNextMonday());
  const [loading, setLoading] = useState(false);
  const [showChangeHistory, setShowChangeHistory] = useState(false);
  const [selectedLogId, setSelectedLogId] = useState(null);
  const [selectedDateKey, setSelectedDateKey] = useState(null);
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

  // Fetch employee, hierarchy, and projects
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch employee profile
        const profileRes = await fetch(
          `${BASE_URL}/api/employees/profile-with-hierarchy?email=${encodeURIComponent(HARDCODED_EMAIL)}`,
          {
            method: "GET",
            headers: { "Content-Type": "application/json" },
            cache: "no-store",
          }
        );
        if (!profileRes.ok) {
          const err = await profileRes.json();
          throw new Error(err.error || `HTTP error ${profileRes.status}`);
        }
        const profileData = await profileRes.json();
        setEmployee(profileData.employee);
        setManagerHierarchy(profileData.manager_hierarchy || []);

        // Fetch projects
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
        setProjects([]);
        toast.error(`Error fetching data: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Initialize empty logs for each day as an array
  useEffect(() => {
    const initializeEmptyLogs = () => {
      const logsMap = {};
      weekDates.forEach((day) => {
        const dateKey = toMMDDYYYY(day.date);
        logsMap[dateKey] = [
          {
            id: `temp-${Date.now()}-${dateKey}-0`,
            start_time: "",
            end_time: "",
            project_id: "",
            description: "",
            total_hours: "0:00",
            date: dateKey,
          },
        ];
      });
      setEditedLogs(logsMap);
    };
    initializeEmptyLogs();
  }, [weekDates]);

  // Save week: check/create timesheet, fetch logs
  const handleSaveWeek = async () => {
    if (!employee?.id || !isValidDate(weekStarting)) {
      toast.error("Please select a valid week starting date and ensure employee data is loaded.");
      return;
    }
    setLoading(true);
    try {
      const checkUrl = `${BASE_URL}/api/timesheets/by-employee-week?employee_id=${employee.id}&week_starting=${weekStarting}`;
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
            week_starting: weekStarting,
          }),
        });
        if (!createRes.ok) {
          const err = await createRes.json();
          throw new Error(err.error || "Failed to save week starting date.");
        }
        timesheet = await createRes.json();
        setTimesheetId(timesheet.id);
        toast.success("Week starting date saved successfully!");
      } else {
        const err = await timesheetRes.json();
        throw new Error(err.error || "Failed to fetch timesheet.");
      }

      // Fetch daily logs
      const logsUrl = `${BASE_URL}/api/daily-logs?timesheet_id=${timesheet.id}`;
      const logsRes = await fetch(logsUrl, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });
      let logsData = [];
      if (logsRes.ok) logsData = await logsRes.json();
      setDailyLogs(logsData);

      // Update logs map: group logs by dateKey as arrays
      const logsMap = {};
      weekDates.forEach((day) => {
        const dateKey = toMMDDYYYY(day.date);
        logsMap[dateKey] = [];
      });
      logsData.forEach((log) => {
        const dateKey = toMMDDYYYY(log.log_date);
        if (dateKey) {
          if (!logsMap[dateKey]) logsMap[dateKey] = [];
          logsMap[dateKey].push({
            id: log.id,
            start_time: normalizeTime(log.start_time) || "",
            end_time: normalizeTime(log.end_time) || "",
            project_id: log.project_id?.toString() || "",
            description: log.description || "",
            total_hours: log.total_hours || calculateTotalHours(log),
            date: dateKey,
          });
        }
      });
      // Ensure at least one empty row per day
      Object.keys(logsMap).forEach((dateKey) => {
        if (logsMap[dateKey].length === 0) {
          logsMap[dateKey] = [
            {
              id: `temp-${Date.now()}-${dateKey}-0`,
              start_time: "",
              end_time: "",
              project_id: "",
              description: "",
              total_hours: "0:00",
              date: dateKey,
            },
          ];
        }
      });
      setEditedLogs(logsMap);
    } catch (error) {
      toast.error(`Error saving week: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Add a new log row for a day
  const handleAddLogRow = (dateKey) => {
    setEditedLogs((prev) => {
      const newRow = {
        id: `temp-${Date.now()}-${dateKey}-${prev[dateKey]?.length || 0}`,
        start_time: "",
        end_time: "",
        project_id: "",
        description: "",
        total_hours: "0:00",
        date: dateKey,
      };
      return {
        ...prev,
        [dateKey]: [...(prev[dateKey] || []), newRow],
      };
    });
  };

  // Remove a log row for a day
  const handleRemoveLogRow = (dateKey, idx) => {
    setEditedLogs((prev) => {
      const updated = [...(prev[dateKey] || [])];
      updated.splice(idx, 1);
      // Always keep at least one row
      if (updated.length === 0) {
        updated.push({
          id: `temp-${Date.now()}-${dateKey}-0`,
          start_time: "",
          end_time: "",
          project_id: "",
          description: "",
          total_hours: "0:00",
          date: dateKey,
        });
      }
      return { ...prev, [dateKey]: updated };
    });
  };

  // Handle time input changes
  const handleTimeChange = (dateKey, idx, field, value) => {
    setEditedLogs((prev) => {
      const updatedLogs = [...(prev[dateKey] || [])];
      const updatedLog = { ...updatedLogs[idx], [field]: normalizeTime(value) };
      updatedLog.total_hours = calculateTotalHours(updatedLog);
      updatedLogs[idx] = updatedLog;
      return { ...prev, [dateKey]: updatedLogs };
    });
  };

  // Handle project dropdown
  const handleProjectChange = (dateKey, idx, value) => {
    setEditedLogs((prev) => {
      const updatedLogs = [...(prev[dateKey] || [])];
      updatedLogs[idx] = { ...updatedLogs[idx], project_id: value };
      return { ...prev, [dateKey]: updatedLogs };
    });
  };

  // Handle description changes
  const handleDescriptionChange = (dateKey, idx, value) => {
    setEditedLogs((prev) => {
      const updatedLogs = [...(prev[dateKey] || [])];
      updatedLogs[idx] = { ...updatedLogs[idx], description: value };
      return { ...prev, [dateKey]: updatedLogs };
    });
  };

  // Save individual log
  const handleSaveLog = async (dateKey, idx) => {
    const log = (editedLogs[dateKey] || [])[idx];
    if (!log) return toast.error("No log data available for this date.");
    if (!employee?.id) return toast.error("Employee data not available.");
    if (!timesheetId) return toast.error("Timesheet not selected. Please save the week first.");
    if (!log.project_id) return toast.error("Please select a project.");
    if (!log.start_time || !log.end_time) return toast.error("Please enter start and end time.");
    const logDate = toYYYYMMDDfromMMDD(dateKey);
    if (!isValidDate(logDate)) return toast.error("Invalid date format for log.");

    setLoading(true);
    try {
      let logId = log.id;
      let isNewLog = typeof logId === "string" && logId.startsWith("temp-");
      const payload = {
        timesheet_id: timesheetId,
        log_date: logDate,
        start_time: normalizeTime(log.start_time),
        end_time: normalizeTime(log.end_time),
        project_id: parseInt(log.project_id, 10),
        description: log.description || "",
        total_hours: calculateTotalHours(log),
      };

      let res;
      if (isNewLog) {
        res = await fetch(`${BASE_URL}/api/daily-logs`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(`${BASE_URL}/api/daily-logs/${logId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `Failed to ${isNewLog ? "create" : "update"} daily log.`);
      }

      toast.success("Log saved successfully!");

      // Refetch logs for the week
      await handleSaveWeek();
    } catch (error) {
      toast.error(`Error saving log: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Fetch log changes (unchanged)
  const fetchLogChanges = async (logId) => {
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
      const changes = await response.json();
      // Fetch approvals for each change
      const changesWithApprovals = await Promise.all(
        changes.map(async (change) => {
          const approvalRes = await fetch(
            `${BASE_URL}/api/project-approvals?daily_log_change_id=${change.id}`,
            {
              method: "GET",
              headers: { "Content-Type": "application/json" },
              cache: "no-store",
            }
          );
          const approvals = approvalRes.ok ? await approvalRes.json() : [];
          return { ...change, approvals };
        })
      );
      setLogChanges(changesWithApprovals);
    } catch (error) {
      toast.error(`Error fetching changes: ${error.message}`);
      setLogChanges([]);
    }
  };

  // Reset logChanges when dialog closes
  useEffect(() => {
    if (!showChangeHistory) {
      setLogChanges([]);
      setSelectedLogId(null);
      setSelectedDateKey(null);
    }
  }, [showChangeHistory]);

  return (
    <div className="container mx-auto p-4">
      <ToastContainer />
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
                <Label htmlFor="employee-status">Status</Label>
                <Input
                  id="employee-status"
                  value={employee.status || ""}
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
              <div>
                <Label className="text-lg font-semibold">Projects & Roles</Label>
                <div className="mt-1 bg-gray-100 p-2 rounded-md">
                  {employee.project_roles?.length > 0 ? (
                    <ul className="list-disc pl-5">
                      {employee.project_roles.map((role) => (
                        <li key={role.id}>
                          {projects.find((p) => p.id === role.project_id)?.project_name || "Unknown"} - {role.role}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    "No projects assigned."
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div>Employee not found.</div>
          )}

          {employee && (
            <>
              <h2 className="text-xl font-bold mt-8 mb-4">Timesheet and Logs</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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
                          <TableHead className="border">Start Time</TableHead>
                          <TableHead className="border">End Time</TableHead>
                          <TableHead className="border">Project</TableHead>
                          <TableHead className="border">Description</TableHead>
                          <TableHead className="border">Total Hours</TableHead>
                          <TableHead className="border">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {weekDates.map((day, dayIdx) => {
                          const dateKey = toMMDDYYYY(day.date);
                          const logs = editedLogs[dateKey] || [];
                          return logs.map((log, idx) => (
                            <TableRow
                              key={log.id}
                              className={idx % 2 === 0 ? "bg-gray-50" : "bg-white"}
                            >
                              {idx === 0 && (
                                <>
                                  <TableCell className="border" rowSpan={logs.length}>
                                    {dateKey}
                                  </TableCell>
                                  <TableCell className="border" rowSpan={logs.length}>
                                    {day.day}
                                  </TableCell>
                                </>
                              )}
                              {idx !== 0 && null}
                              <TableCell className="border">
                                <Input
                                  type="time"
                                  value={log.start_time || ""}
                                  onChange={(e) =>
                                    handleTimeChange(dateKey, idx, "start_time", e.target.value)
                                  }
                                />
                              </TableCell>
                              <TableCell className="border">
                                <Input
                                  type="time"
                                  value={log.end_time || ""}
                                  onChange={(e) =>
                                    handleTimeChange(dateKey, idx, "end_time", e.target.value)
                                  }
                                />
                              </TableCell>
                              <TableCell className="border">
                                <Select
                                  value={log.project_id || ""}
                                  onValueChange={(value) => handleProjectChange(dateKey, idx, value)}
                                >
                                  <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select Project" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {projects.map((proj) => (
                                      <SelectItem key={proj.id} value={proj.id.toString()}>
                                        {proj.project_name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell className="border">
                                <Input
                                  value={log.description || ""}
                                  onChange={(e) => handleDescriptionChange(dateKey, idx, e.target.value)}
                                />
                              </TableCell>
                              <TableCell className="border">
                                {log.total_hours || "0:00"}
                              </TableCell>
                              <TableCell className="border">
                                <div className="flex space-x-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleSaveLog(dateKey, idx)}
                                    disabled={loading || !timesheetId}
                                  >
                                    Save
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleRemoveLogRow(dateKey, idx)}
                                    disabled={logs.length === 1}
                                  >
                                    Remove
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
                                          setSelectedDateKey(dateKey);
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
                                              <TableHead className="border">Project</TableHead>
                                              <TableHead className="border">Description</TableHead>
                                              <TableHead className="border">Changed At</TableHead>
                                              <TableHead className="border">Approval Status</TableHead>
                                            </TableRow>
                                          </TableHeader>
                                          <TableBody>
                                            {logChanges.map((change, index) => (
                                              <TableRow
                                                key={change.id}
                                                className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}
                                              >
                                                <TableCell className="border">
                                                  {change.project_id
                                                    ? projects.find((p) => p.id === change.project_id)?.project_name || "Unknown"
                                                    : "None"}
                                                </TableCell>
                                                <TableCell className="border">
                                                  {change.change_description || "No description"}
                                                </TableCell>
                                                <TableCell className="border text-sm">
                                                  {new Date(change.changed_at).toLocaleString("en-IN", {
                                                    timeZone: "Asia/Kolkata",
                                                  })}
                                                </TableCell>
                                                <TableCell className="border">
                                                  {change.approvals?.length > 0 ? (
                                                    <div>
                                                      <span
                                                        className={`font-semibold ${
                                                          change.approvals[0].status === "approved"
                                                            ? "text-green-600"
                                                            : change.approvals[0].status === "rejected"
                                                            ? "text-red-600"
                                                            : "text-yellow-600"
                                                        }`}
                                                      >
                                                        {change.approvals[0].status.charAt(0).toUpperCase() +
                                                          change.approvals[0].status.slice(1)}
                                                      </span>
                                                      {change.approvals[0].comments && (
                                                        <p className="text-sm text-gray-500">
                                                          Comments: {change.approvals[0].comments}
                                                        </p>
                                                      )}
                                                    </div>
                                                  ) : (
                                                    "Pending"
                                                  )}
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
                          )).concat([
                            <TableRow key={dateKey + "-add"}>
                              <TableCell colSpan={8} className="border text-center">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleAddLogRow(dateKey)}
                                  disabled={loading}
                                >
                                  + Add Entry for {dateKey}
                                </Button>
                              </TableCell>
                            </TableRow>
                          ]);
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