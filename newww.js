"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Configuration
const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:5000";
const CURRENT_EMAIL = "employee36@company.com"; // Replace with auth context in production

// Utility Functions
const toYYYYMMDD = (date) => {
  if (!date) return "";
  const d = new Date(date);
  return d.toISOString().split("T")[0];
};
const isValidDate = (dateStr) => {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const date = new Date(dateStr);
  return !isNaN(date.getTime());
};
const normalizeTime = (timeStr) => {
  if (!timeStr) return "";
  return timeStr.split(":").slice(0, 2).join(":");
};
const calculateTotalHours = (log) => {
  if (!log.start_time || !log.end_time) return "0:00";
  const parseTime = (time) => {
    const [hours, minutes] = time.split(":").map(Number);
    return (isNaN(hours) || isNaN(minutes)) ? 0 : hours * 60 + minutes;
  };
  let totalMinutes = parseTime(log.end_time) - parseTime(log.start_time);
  if (totalMinutes < 0) totalMinutes += 24 * 60; // Handle overnight
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}:${minutes.toString().padStart(2, "0")}`;
};
const getDayOfWeek = (dateStr) => {
  if (!isValidDate(dateStr)) return "";
  const date = new Date(dateStr);
  return date.toLocaleString("en-US", { weekday: "long" });
};

// HierarchyTree Component
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

// TimesheetTable for a single day
const TimesheetTable = ({
  logs,
  projects,
  loading,
  setLogs,
  handleSaveLog,
  handleAddLogRow,
  handleRemoveLogRow,
}) => {
  const handleTimeChange = (idx, field, value) => {
    setLogs((prev) => {
      const updatedLogs = [...prev];
      const updatedLog = { ...updatedLogs[idx], [field]: normalizeTime(value) };
      updatedLog.total_hours = calculateTotalHours(updatedLog);
      updatedLogs[idx] = updatedLog;
      return updatedLogs;
    });
  };

  const handleProjectChange = (idx, value) => {
    setLogs((prev) => {
      const updatedLogs = [...prev];
      updatedLogs[idx] = { ...updatedLogs[idx], project_id: value };
      return updatedLogs;
    });
  };

  const handleDescriptionChange = (idx, value) => {
    setLogs((prev) => {
      const updatedLogs = [...prev];
      updatedLogs[idx] = { ...updatedLogs[idx], description: value };
      return updatedLogs;
    });
  };

  return (
    <div className="w-full overflow-auto">
      <Table>
        <TableHeader className="bg-blue-100">
          <TableRow>
            <TableHead className="border">Start Time</TableHead>
            <TableHead className="border">End Time</TableHead>
            <TableHead className="border">Project</TableHead>
            <TableHead className="border">Description</TableHead>
            <TableHead className="border">Total Hours</TableHead>
            <TableHead className="border">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log, idx) => (
            <TableRow key={log.id} className={idx % 2 === 0 ? "bg-gray-50" : "bg-white"}>
              <TableCell className="border">
                <Input
                  type="time"
                  value={log.start_time || ""}
                  onChange={(e) => handleTimeChange(idx, "start_time", e.target.value)}
                />
              </TableCell>
              <TableCell className="border">
                <Input
                  type="time"
                  value={log.end_time || ""}
                  onChange={(e) => handleTimeChange(idx, "end_time", e.target.value)}
                />
              </TableCell>
              <TableCell className="border">
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
                        {proj.project_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell className="border">
                <textarea
                  className="w-full border rounded p-2 min-h-[48px] resize-vertical"
                  value={log.description || ""}
                  onChange={(e) => handleDescriptionChange(idx, e.target.value)}
                  placeholder="Enter detailed description"
                  rows={2}
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
                    onClick={() => handleSaveLog(idx)}
                    disabled={loading}
                  >
                    Save
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleRemoveLogRow(idx)}
                    disabled={logs.length === 1}
                  >
                    Remove
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
          <TableRow>
            <TableCell colSpan={6} className="border text-center">
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddLogRow}
                disabled={loading}
              >
                + Add Entry
              </Button>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
};

export default function Home() {
  const [employee, setEmployee] = useState(null);
  const [managerHierarchy, setManagerHierarchy] = useState([]);
  const [department, setDepartment] = useState(null);
  const [projects, setProjects] = useState([]);
  const [logs, setLogs] = useState([]);
  const [selectedDate, setSelectedDate] = useState(toYYYYMMDD(new Date()));
  const [loading, setLoading] = useState(false);
  const [timesheetId, setTimesheetId] = useState(null);

  // Fetch employee, hierarchy, department, and projects
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const profileRes = await fetch(
          `${BASE_URL}/api/employees/profile-with-hierarchy?email=${encodeURIComponent(CURRENT_EMAIL)}`,
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
        setDepartment(profileData.department || null);

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
        setProjects([]);
        toast.error(`Error fetching data: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Initialize logs for the selected day
  useEffect(() => {
    setLogs([
      {
        id: `temp-${Date.now()}-0`,
        start_time: "",
        end_time: "",
        project_id: "",
        description: "",
        total_hours: "0:00",
        date: selectedDate,
      },
    ]);
    setTimesheetId(null);
  }, [selectedDate]);

  // Save day: check/create timesheet, fetch logs for the day
  const handleSaveDay = async () => {
    if (!employee?.id || !isValidDate(selectedDate)) {
      toast.error("Please select a valid date and ensure employee data is loaded.");
      return;
    }
    setLoading(true);
    try {
      // Check or create timesheet for the week of the selected date
      const weekStart = (() => {
        const d = new Date(selectedDate);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday as start
        const monday = new Date(d.setDate(diff));
        return toYYYYMMDD(monday);
      })();

      const checkUrl = `${BASE_URL}/api/timesheets/by-employee-week?employee_id=${employee.id}&week_starting=${weekStart}`;
      let timesheetRes = await fetch(checkUrl, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });

      let timesheet;
      if (timesheetRes.ok) {
        timesheet = await timesheetRes.json();
        setTimesheetId(timesheet.id);
      } else if (timesheetRes.status === 404) {
        const createRes = await fetch(`${BASE_URL}/api/timesheets`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            employee_id: employee.id,
            week_starting: weekStart,
          }),
        });
        if (!createRes.ok) {
          const err = await createRes.json();
          throw new Error(err.error || "Failed to save week starting date.");
        }
        timesheet = await createRes.json();
        setTimesheetId(timesheet.id);
      } else {
        const err = await timesheetRes.json();
        throw new Error(err.error || "Failed to fetch timesheet.");
      }

      // Fetch daily logs for the selected date
      const logsUrl = `${BASE_URL}/api/daily-logs?timesheet_id=${timesheet.id}`;
      const logsRes = await fetch(logsUrl, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });
      let logsData = [];
      if (logsRes.ok) logsData = await logsRes.json();
      // Filter logs for the selected date only
      const filtered = logsData.filter((log) => log.log_date === selectedDate);
      setLogs(
        filtered.length > 0
          ? filtered.map((log, idx) => ({
              id: log.id,
              start_time: normalizeTime(log.start_time) || "",
              end_time: normalizeTime(log.end_time) || "",
              project_id: log.project_id?.toString() || "",
              description: log.description || "",
              total_hours: log.total_hours || calculateTotalHours(log),
              date: selectedDate,
            }))
          : [
              {
                id: `temp-${Date.now()}-0`,
                start_time: "",
                end_time: "",
                project_id: "",
                description: "",
                total_hours: "0:00",
                date: selectedDate,
              },
            ]
      );
    } catch (error) {
      toast.error(`Error saving day: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Add a new log row for the day
  const handleAddLogRow = () => {
    setLogs((prev) => [
      ...prev,
      {
        id: `temp-${Date.now()}-${prev.length}`,
        start_time: "",
        end_time: "",
        project_id: "",
        description: "",
        total_hours: "0:00",
        date: selectedDate,
      },
    ]);
  };

  // Remove a log row for the day
  const handleRemoveLogRow = (idx) => {
    setLogs((prev) => {
      const updated = [...prev];
      updated.splice(idx, 1);
      if (updated.length === 0) {
        updated.push({
          id: `temp-${Date.now()}-0`,
          start_time: "",
          end_time: "",
          project_id: "",
          description: "",
          total_hours: "0:00",
          date: selectedDate,
        });
      }
      return updated;
    });
  };

  // Save individual log
  const handleSaveLog = async (idx) => {
    const log = logs[idx];
    if (!log) return toast.error("No log data available for this date.");
    if (!employee?.id) return toast.error("Employee data not available.");
    if (!timesheetId) return toast.error("Timesheet not selected. Please save the day first.");
    if (!log.project_id) return toast.error("Please select a project.");
    if (!log.start_time || !log.end_time) return toast.error("Please enter start and end time.");
    if (!isValidDate(selectedDate)) return toast.error("Invalid date format for log.");

    setLoading(true);
    try {
      let logId = log.id;
      let isNewLog = typeof logId === "string" && logId.startsWith("temp-");
      const payload = {
        timesheet_id: timesheetId,
        log_date: selectedDate,
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
      await handleSaveDay();
    } catch (error) {
      toast.error(`Error saving log: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // --- UI ---
  return (
    <div className="container mx-auto p-4">
      <ToastContainer />
      <Card className="w-full">
        <CardHeader className="bg-blue-100 text-center py-4">
          <CardTitle className="text-2xl font-bold">
            Time Sheet for Employees (Single Day)
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
                <Label htmlFor="employee-department">Department</Label>
                <Input
                  id="employee-department"
                  value={department?.name || "No department"}
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
              <h2 className="text-xl font-bold mt-8 mb-4">Timesheet and Logs (Single Day)</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <Label htmlFor="date">Date</Label>
                  <div className="flex items-center space-x-3">
                    <Input
                      id="date"
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="mt-1"
                    />
                    <span className="text-gray-700 font-semibold">
                      {getDayOfWeek(selectedDate)}
                    </span>
                  </div>
                </div>
                <div className="flex items-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSaveDay}
                    disabled={loading || !selectedDate}
                  >
                    Load/Save Day
                  </Button>
                </div>
              </div>

              {logs.length > 0 && (
                loading ? (
                  <div>Loading...</div>
                ) : (
                  <TimesheetTable
                    logs={logs}
                    projects={projects}
                    loading={loading}
                    setLogs={setLogs}
                    handleSaveLog={handleSaveLog}
                    handleAddLogRow={handleAddLogRow}
                    handleRemoveLogRow={handleRemoveLogRow}
                  />
                )
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}