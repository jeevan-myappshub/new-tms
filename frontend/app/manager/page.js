"use client";
import React, { useState, useEffect, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:5000";
const CURRENT_EMAIL = "websterjames@example.org"; // Replace with auth context in production
const PAGE_SIZE = 10;

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

const HierarchyTree = ({ hierarchy, currentEmployee }) => {
  // hierarchy: array of managers above, bottom-up; currentEmployee: the employee at the bottom
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
            <span className="text-xs text-gray-500">
              {person.department?.name || ""}
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

export default function ManagerPage() {
  const [manager, setManager] = useState(null);
  const [managerHierarchy, setManagerHierarchy] = useState([]);
  const [department, setDepartment] = useState(null);
  const [designation, setDesignation] = useState(null);
  const [directReports, setDirectReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showEmployeeDialog, setShowEmployeeDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch manager profile and direct reports
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch manager's profile
        const profileRes = await fetch(
          `${BASE_URL}/api/employees/profile-with-hierarchy?email=${encodeURIComponent(CURRENT_EMAIL)}`,
          { method: "GET", headers: { "Content-Type": "application/json" }, cache: "no-store" }
        );
        if (!profileRes.ok) throw new Error("Failed to fetch manager profile");
        const profileData = await profileRes.json();
        setManager(profileData.employee);
        setManagerHierarchy(profileData.manager_hierarchy || []);
        setDepartment(profileData.department || null);
        setDesignation(profileData.designation || null);

        // Fetch direct reports (employees who report to this manager)
        const reportsRes = await fetch(
          `${BASE_URL}/api/employees/with-details?manager_id=${profileData.employee.id}`,
          { method: "GET", headers: { "Content-Type": "application/json" }, cache: "no-store" }
        );
        if (!reportsRes.ok) throw new Error("Failed to fetch direct reports");
        let reportsData = await reportsRes.json();
        reportsData = reportsData.sort((a, b) => a.id - b.id);
        setDirectReports(reportsData);
      } catch (error) {
        toast.error(`Error fetching data: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const totalPages = Math.ceil(directReports.length / PAGE_SIZE);
  const paginatedDirectReports = directReports.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const handlePageChange = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  return (
    <div className="container mx-auto p-4">
      <ToastContainer />
      <Card className="w-full mb-6">
        <CardHeader className="bg-blue-100 text-center py-4">
          <CardTitle className="text-2xl font-bold">
            Manager Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <h2 className="text-xl font-bold mb-4">My Information</h2>
          {loading ? (
            <div>Loading...</div>
          ) : manager ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <Label htmlFor="manager-name">Name</Label>
                <Input
                  id="manager-name"
                  value={manager.employee_name || ""}
                  readOnly
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="manager-email">Email</Label>
                <Input
                  id="manager-email"
                  value={manager.email || ""}
                  readOnly
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="manager-department">Department</Label>
                <Input
                  id="manager-department"
                  value={department?.name || "No department"}
                  readOnly
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="manager-designation">Designation</Label>
                <Input
                  id="manager-designation"
                  value={designation?.title || "No designation"}
                  readOnly
                  className="mt-1"
                />
              </div>
              <div className="md:col-span-2">
                <Label className="text-lg font-semibold">Manager Hierarchy (Above Me)</Label>
                <HierarchyTree
                  hierarchy={managerHierarchy}
                  currentEmployee={manager}
                />
              </div>
            </div>
          ) : (
            <div>Manager profile not found.</div>
          )}

          <h2 className="text-xl font-bold mt-8 mb-4">Direct Reports</h2>
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
                    <TableHead>Manager Hierarchy</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedDirectReports.map((emp) => (
                    <TableRow key={emp.id}>
                      <TableCell>{emp.id}</TableCell>
                      <TableCell>{emp.employee_name}</TableCell>
                      <TableCell>{emp.email}</TableCell>
                      <TableCell>{emp.department?.name || "None"}</TableCell>
                      <TableCell>{emp.designation?.title || "None"}</TableCell>
                      <TableCell>
                        <HierarchyTree
                          hierarchy={emp.manager_hierarchy}
                          currentEmployee={emp}
                        />
                      </TableCell>
                      <TableCell>
                        <Dialog open={showEmployeeDialog && selectedEmployee?.id === emp.id} onOpenChange={setShowEmployeeDialog}>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedEmployee(emp);
                                setShowEmployeeDialog(true);
                              }}
                            >
                              View Details
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>
                                Details for {emp.employee_name}
                              </DialogTitle>
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
                                  value={emp.department?.name || "No department"}
                                  readOnly
                                  className="mt-1"
                                />
                              </div>
                              <div>
                                <Label htmlFor="emp-designation">Designation</Label>
                                <Input
                                  id="emp-designation"
                                  value={emp.designation?.title || "No designation"}
                                  readOnly
                                  className="mt-1"
                                />
                              </div>
                              <div className="md:col-span-2">
                                <Label className="text-lg font-semibold">Manager Hierarchy (Above)</Label>
                                <HierarchyTree
                                  hierarchy={emp.manager_hierarchy}
                                  currentEmployee={emp}
                                />
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
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