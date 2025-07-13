"use client";
import { useState, useEffect } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:5000";
const PAGE_SIZE = 10;

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
              {person.designation?.title || "No designation"}
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

export default function AdminPage() {
  const [employees, setEmployees] = useState([]);
  const [managers, setManagers] = useState({});
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employeeTimesheets, setEmployeeTimesheets] = useState([]);
  const [selectedTimesheet, setSelectedTimesheet] = useState(null);
  const [dailyLogs, setDailyLogs] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [managerHierarchy, setManagerHierarchy] = useState([]);
  const [department, setDepartment] = useState(null);
  const [designation, setDesignation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showEmployeeDialog, setShowEmployeeDialog] = useState(false);
  const [showLogsDialog, setShowLogsDialog] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [newEmpName, setNewEmpName] = useState("");
  const [newEmpEmail, setNewEmpEmail] = useState("");
  const [newEmpManagerId, setNewEmpManagerId] = useState("");
  const [newEmpDepartmentId, setNewEmpDepartmentId] = useState("");
  const [newEmpDesignationId, setNewEmpDesignationId] = useState("");

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const empRes = await fetch(`${BASE_URL}/api/employees/with-details`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });
      if (!empRes.ok) throw new Error(`Failed to fetch employees: ${empRes.statusText}`);
      let empData = await empRes.json();
      empData = empData.sort((a, b) => a.id - b.id);
      setEmployees(empData);

      const mgrMap = {};
      empData.forEach((emp) => {
        mgrMap[emp.id] = emp.employee_name;
      });
      setManagers(mgrMap);

      const deptRes = await fetch(`${BASE_URL}/api/departments`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });
      if (!deptRes.ok) throw new Error(`Failed to fetch departments: ${deptRes.statusText}`);
      setDepartments(await deptRes.json());

      const desRes = await fetch(`${BASE_URL}/api/designations`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });
      if (!desRes.ok) throw new Error(`Failed to fetch designations: ${desRes.statusText}`);
      setDesignations(await desRes.json());
    } catch (error) {
      console.error("Error in fetchAllData:", error);
      toast.error(error.message || "Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  const handleEmployeeSelect = async (emp) => {
    setSelectedEmployee(emp);
    setEmployeeTimesheets([]);
    setDailyLogs([]);
    setManagerHierarchy(emp.manager_hierarchy || []);
    setDepartment(emp.department || null);
    setDesignation(emp.designation || null);
    setShowEmployeeDialog(true);
    setShowLogsDialog(false);
    setLoading(true);
    try {
      const res = await fetch(
        `${BASE_URL}/api/timesheets/by-employee-name?employee_name=${encodeURIComponent(
          emp.employee_name
        )}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        }
      );
      if (!res.ok) throw new Error(`Failed to fetch timesheets: ${res.statusText}`);
      let data = await res.json();
      data = data.sort((a, b) => a.id - b.id);
      setEmployeeTimesheets(data);
    } catch (error) {
      console.error("Error in handleEmployeeSelect:", error);
      toast.error(error.message || "Failed to fetch timesheets");
    } finally {
      setLoading(false);
    }
  };

  const handleTimesheetSelect = async (ts) => {
    setSelectedTimesheet(ts);
    setDailyLogs([]);
    setShowLogsDialog(true);
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/timesheets/${ts.id}/daily-logs`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`Failed to fetch daily logs: ${res.statusText}`);
      let data = await res.json();
      data = data.sort((a, b) => a.id - b.id);
      setDailyLogs(data);
    } catch (error) {
      console.error("Error in handleTimesheetSelect:", error);
      toast.error(error.message || "Failed to fetch daily logs");
    } finally {
      setLoading(false);
    }
  };

  const getManagerName = (reportsToId) => {
    if (!reportsToId) return "None";
    return managers[reportsToId] || "Unknown";
  };

  const totalPages = Math.ceil(employees.length / PAGE_SIZE);
  const paginatedEmployees = employees.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const handlePageChange = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    const trimmedName = newEmpName.trim();
    const trimmedEmail = newEmpEmail.trim();

    // Log input values for debugging
    console.log("handleAddEmployee input:", {
      employee_name: trimmedName,
      email: trimmedEmail,
      reports_to: newEmpManagerId,
      department_id: newEmpDepartmentId,
      designation_id: newEmpDesignationId,
    });

    if (!trimmedName || !trimmedEmail || !newEmpDepartmentId || !newEmpDesignationId) {
      toast.error("Name, email, department, and designation are required.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        employee_name: trimmedName,
        email: trimmedEmail,
        reports_to: newEmpManagerId === "none" ? null : parseInt(newEmpManagerId, 10),
        department_id: parseInt(newEmpDepartmentId, 10),
        designation_id: parseInt(newEmpDesignationId, 10),
      };
      console.log("Sending payload to backend:", payload);

      const res = await fetch(`${BASE_URL}/api/employees`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `Failed to add employee: ${res.statusText}`);
      }

      toast.success("Employee added successfully!");
      setShowAddDialog(false);
      setNewEmpName("");
      setNewEmpEmail("");
      setNewEmpManagerId("");
      setNewEmpDepartmentId("");
      setNewEmpDesignationId("");
      await fetchAllData();
    } catch (error) {
      console.error("Error in handleAddEmployee:", error);
      toast.error(error.message || "Failed to add employee");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <ToastContainer />
      <Card className="w-full mb-6">
        <CardHeader className="bg-blue-100 text-center py-4 flex flex-col md:flex-row md:justify-between md:items-center">
          <CardTitle className="text-2xl font-bold">Admin Dashboard</CardTitle>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button
                variant="default"
                className="mt-4 md:mt-0"
                onClick={() => setShowAddDialog(true)}
              >
                Add Employee
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Employee</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddEmployee} className="space-y-4">
                <div>
                  <Label htmlFor="emp-name">Name</Label>
                  <Input
                    id="emp-name"
                    value={newEmpName}
                    onChange={(e) => setNewEmpName(e.target.value)}
                    required
                    placeholder="Enter employee name"
                    aria-required="true"
                  />
                </div>
                <div>
                  <Label htmlFor="emp-email">Email</Label>
                  <Input
                    id="emp-email"
                    type="email"
                    value={newEmpEmail}
                    onChange={(e) => setNewEmpEmail(e.target.value)}
                    required
                    placeholder="Enter employee email"
                    aria-required="true"
                  />
                </div>
                <div>
                  <Label htmlFor="emp-manager-id">Manager (Optional)</Label>
                  <Select
                    value={newEmpManagerId}
                    onValueChange={setNewEmpManagerId}
                  >
                    <SelectTrigger id="emp-manager-id" aria-label="Select Manager">
                      <SelectValue placeholder="Select Manager" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {employees.map((emp) => (
                        <SelectItem key={emp.id} value={String(emp.id)}>
                          {emp.employee_name} (ID: {emp.id})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="emp-department-id">Department</Label>
                  <Select
                    value={newEmpDepartmentId}
                    onValueChange={setNewEmpDepartmentId}
                    required
                  >
                    <SelectTrigger id="emp-department-id" aria-label="Select Department">
                      <SelectValue placeholder="Select Department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={String(dept.id)}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="emp-designation-id">Designation</Label>
                  <Select
                    value={newEmpDesignationId}
                    onValueChange={setNewEmpDesignationId}
                    required
                  >
                    <SelectTrigger id="emp-designation-id" aria-label="Select Designation">
                      <SelectValue placeholder="Select Designation" />
                    </SelectTrigger>
                    <SelectContent>
                      {designations.map((des) => (
                        <SelectItem key={des.id} value={String(des.id)}>
                          {des.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAddDialog(false)}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" variant="default" disabled={loading}>
                    {loading ? "Adding..." : "Add Employee"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <h2 className="text-xl font-bold mb-4">All Employees</h2>
          {loading ? (
            <div>Loading...</div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Designation</TableHead>
                    <TableHead>Manager</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedEmployees.map((emp) => (
                    <TableRow key={emp.id}>
                      <TableCell>{emp.id}</TableCell>
                      <TableCell>{emp.employee_name}</TableCell>
                      <TableCell>{emp.email}</TableCell>
                      <TableCell>{emp.department?.name || "None"}</TableCell>
                      <TableCell>{emp.designation?.title || "None"}</TableCell>
                      <TableCell>{getManagerName(emp.reports_to)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Dialog
                            open={showEmployeeDialog && selectedEmployee?.id === emp.id}
                            onOpenChange={setShowEmployeeDialog}
                          >
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEmployeeSelect(emp)}
                              >
                                View Timesheets
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl">
                              <DialogHeader>
                                <DialogTitle>Details for {emp.employee_name}</DialogTitle>
                              </DialogHeader>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div>
                                  <Label htmlFor="emp-name">Name</Label>
                                  <Input
                                    id="emp-name"
                                    value={emp.employee_name || ""}
                                    readOnly
                                    className="mt-1"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="emp-email">Email</Label>
                                  <Input
                                    id="emp-email"
                                    value={emp.email || ""}
                                    readOnly
                                    className="mt-1"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="emp-department">Department</Label>
                                  <Input
                                    id="emp-department"
                                    value={department?.name || "No department"}
                                    readOnly
                                    className="mt-1"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="emp-designation">Designation</Label>
                                  <Input
                                    id="emp-designation"
                                    value={designation?.title || "No designation"}
                                    readOnly
                                    className="mt-1"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="reports-to">Reports To</Label>
                                  <Input
                                    id="reports-to"
                                    value={getManagerName(emp.reports_to)}
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
                                        currentEmployee={emp}
                                      />
                                    </DialogContent>
                                  </Dialog>
                                </div>
                              </div>
                              <h3 className="text-lg font-bold mt-4">Timesheets</h3>
                              {loading ? (
                                <div>Loading...</div>
                              ) : employeeTimesheets.length === 0 ? (
                                <div>No timesheets found for this employee.</div>
                              ) : (
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>ID</TableHead>
                                      <TableHead>Week Starting</TableHead>
                                      <TableHead>Actions</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {employeeTimesheets.map((ts) => (
                                      <TableRow key={ts.id}>
                                        <TableCell>{ts.id}</TableCell>
                                        <TableCell>
                                          {ts.week_starting
                                            ? new Date(ts.week_starting).toLocaleDateString()
                                            : ""}
                                        </TableCell>
                                        <TableCell>
                                          <Dialog
                                            open={showLogsDialog && selectedTimesheet?.id === ts.id}
                                            onOpenChange={setShowLogsDialog}
                                          >
                                            <DialogTrigger asChild>
                                              <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleTimesheetSelect(ts)}
                                              >
                                                View Daily Logs
                                              </Button>
                                            </DialogTrigger>
                                            <DialogContent className="max-w-4xl">
                                              <DialogHeader>
                                                <DialogTitle>
                                                  Daily Logs for Timesheet #{ts.id} (
                                                  {ts.week_starting
                                                    ? new Date(ts.week_starting).toLocaleDateString()
                                                    : ""}
                                                  )
                                                </DialogTitle>
                                              </DialogHeader>
                                              {loading ? (
                                                <div>Loading...</div>
                                              ) : dailyLogs.length === 0 ? (
                                                <div>No daily logs found for this timesheet.</div>
                                              ) : (
                                                <Table>
                                                  <TableHeader>
                                                    <TableRow>
                                                      <TableHead>ID</TableHead>
                                                      <TableHead>Date</TableHead>
                                                      <TableHead>Day</TableHead>
                                                      <TableHead>Description</TableHead>
                                                      <TableHead>Start Time</TableHead>
                                                      <TableHead>End Time</TableHead>
                                                      <TableHead>Total Hours</TableHead>
                                                    </TableRow>
                                                  </TableHeader>
                                                  <TableBody>
                                                    {dailyLogs.map((log) => (
                                                      <TableRow key={log.id}>
                                                        <TableCell>{log.id}</TableCell>
                                                        <TableCell>
                                                          {log.log_date
                                                            ? new Date(log.log_date).toLocaleDateString()
                                                            : ""}
                                                        </TableCell>
                                                        <TableCell>{log.day_of_week}</TableCell>
                                                        <TableCell>
                                                          {log.task_description || log.description}
                                                        </TableCell>
                                                        <TableCell>
                                                          {log.start_time?.slice(0, 5) || ""}
                                                        </TableCell>
                                                        <TableCell>
                                                          {log.end_time?.slice(0, 5) || ""}
                                                        </TableCell>
                                                        <TableCell>
                                                          {log.total_hours?.slice(0, 5) || "0:00"}
                                                        </TableCell>
                                                      </TableRow>
                                                    ))}
                                                  </TableBody>
                                                </Table>
                                              )}
                                            </DialogContent>
                                          </Dialog>
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              )}
                            </DialogContent>
                          </Dialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex justify-center items-center mt-4 space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <span>
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}