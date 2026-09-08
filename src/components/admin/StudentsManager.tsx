import React, { useState, useRef } from "react";
import {
  Upload,
  Plus,
  Search,
  Trash2,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  X,
  Filter,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Users2,
  Link,
  Mail,
} from "lucide-react";
import { StudentRow } from "../../types.ts";
import { dbService } from "../../lib/supabase.ts";
import { getUserAvatarUrl } from "../../lib/avatar.ts";

interface StudentsManagerProps {
  students: StudentRow[];
  refreshDatabaseState: () => Promise<void>;
  showToast: (msg: string) => void;
  setIsLoading: (val: boolean) => void;
}

export default function StudentsManager({
  students,
  refreshDatabaseState,
  showToast,
  setIsLoading,
}: StudentsManagerProps) {
  // Modal / Form trigger states
  const [isAddingSingle, setIsAddingSingle] = useState(false);
  const [isUploadingCSV, setIsUploadingCSV] = useState(false);

  // Manual student Google email linking state
  const [linkingStudentId, setLinkingStudentId] = useState<string | null>(null);
  const [manualEmailInput, setManualEmailInput] = useState("");

  // Single Student form inputs
  const [programName, setProgramName] = useState("");
  const [academicYear, setAcademicYear] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [cumNumber, setCumNumber] = useState("");
  const [surname, setSurname] = useState("");
  const [firstName, setFirstName] = useState("");
  const [gender, setGender] = useState("M");

  // CSV Drag and drop states
  const [dragActive, setDragActive] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [importLogs, setImportLogs] = useState<{
    success?: string;
    error?: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Table search & filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [programFilter, setProgramFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [genderFilter, setGenderFilter] = useState("all");
  const [activeSubTab, setActiveSubTab] = useState<"verified" | "pending">(
    "verified",
  );

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  // Derive unique programs & years for filter dropdowns
  const uniquePrograms = Array.from(
    new Set(students.map((s) => s.program_name)),
  ).filter(Boolean);
  const uniqueYears = Array.from(
    new Set(students.map((s) => s.academic_year)),
  ).filter(Boolean);

  // Handle single student submit
  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !programName ||
      !academicYear ||
      !registrationNumber ||
      !cumNumber ||
      !surname ||
      !firstName ||
      !gender
    ) {
      showToast("Please fill in all student properties.");
      return;
    }

    try {
      setIsLoading(true);
      await dbService.insertStudent({
        program_name: programName.trim(),
        academic_year: academicYear.trim(),
        registration_number: registrationNumber.trim(),
        cum_number: cumNumber.trim(),
        surname: surname.trim(),
        first_name: firstName.trim(),
        gender: gender.trim(),
      });
      showToast(`Student ${firstName} ${surname} created successfully!`);

      // Reset form & state
      setProgramName("");
      setAcademicYear("");
      setRegistrationNumber("");
      setCumNumber("");
      setSurname("");
      setFirstName("");
      setGender("M");
      setIsAddingSingle(false);

      await refreshDatabaseState();
    } catch (err: any) {
      showToast(`Creation error: ${err.message || "Failed to add student"}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Safe manual CSV string parser
  const parseCSVText = (text: string) => {
    const rows = text.split("\n").map((line) => {
      // Split by comma but respect quotes
      const result: string[] = [];
      let current = "";
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === "," && !inQuotes) {
          result.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    });

    return rows.filter((r) => r.length > 1 && r.some((cell) => cell !== ""));
  };

  // Handle CSV file loader
  const processCSVFile = (text: string) => {
    const rawRows = parseCSVText(text);
    if (rawRows.length < 2) {
      setImportLogs({
        error:
          "CSV must contain at least a header row and one student data row.",
      });
      return;
    }

    // Auto-detect index mapping of headers
    const headers = rawRows[0].map((h) =>
      h.toLowerCase().replace(/_/g, " ").trim(),
    );

    const findIndex = (aliases: string[]) => {
      return headers.findIndex((h) =>
        aliases.some((alias) => h.includes(alias)),
      );
    };

    const mapping = {
      program: findIndex(["program", "course", "degree"]),
      year: findIndex(["academic year", "year", "class", "cohort"]),
      reg: findIndex(["registration", "reg number", "reg no", "id", "matric"]),
      cum: findIndex(["cum", "cum number", "gpa", "cumulative"]),
      surname: findIndex(["surname", "last name", "lastname"]),
      firstName: findIndex(["first name", "firstname", "name"]),
      gender: findIndex(["gender", "sex"]),
    };

    // Parse records
    const parsedData = rawRows.slice(1).map((row) => {
      const getVal = (idx: number, fallback: string = "") =>
        idx >= 0 && row[idx] ? row[idx] : fallback;

      return {
        program_name: getVal(mapping.program, "General Program"),
        academic_year: getVal(mapping.year, "2026/2027"),
        registration_number: getVal(
          mapping.reg,
          "REG_" + Math.floor(Math.random() * 1000000),
        ),
        cum_number: getVal(mapping.cum, "0"),
        surname: getVal(mapping.surname, "Unknown"),
        first_name: getVal(mapping.firstName, "Student"),
        gender: getVal(mapping.gender, "M"),
      };
    });

    setPreviewRows(parsedData);
    setImportLogs(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      setCsvText(text);
      processCSVFile(text);
    };
    reader.readAsText(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const text = evt.target?.result as string;
        setCsvText(text);
        processCSVFile(text);
      };
      reader.readAsText(file);
    }
  };

  // Import confirmed bulk rows
  const handleImportConfirm = async () => {
    if (previewRows.length === 0) {
      showToast("No student records parsed to import.");
      return;
    }

    try {
      setIsLoading(true);
      await dbService.importStudentsBulk(previewRows);
      showToast(
        `Successfully processed and merged ${previewRows.length} student records.`,
      );
      setImportLogs({
        success: `Merged ${previewRows.length} students into active database.`,
      });
      setPreviewRows([]);
      setCsvText("");
      setIsUploadingCSV(false);
      await refreshDatabaseState();
    } catch (err: any) {
      setImportLogs({
        error: `Import failed: ${err.message || "Unique conflict on registration number keys."}`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Delete student handler
  const handleDeleteStudent = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete student "${name}"?`)) {
      return;
    }

    try {
      setIsLoading(true);
      await dbService.deleteStudent(id);
      showToast(`Student "${name}" deleted.`);
      await refreshDatabaseState();
    } catch (err: any) {
      showToast(`Delete failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Approve student handler
  const handleApproveStudent = async (id: string, name: string) => {
    try {
      setIsLoading(true);
      await dbService.approveStudent(id);
      showToast(`Student record for "${name}" approved successfully.`);
      await refreshDatabaseState();
    } catch (err: any) {
      showToast(`Approval failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Manual link email handler
  const handleManualLinkEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkingStudentId) return;
    const targetEmail = manualEmailInput.trim().toLowerCase();
    if (!targetEmail.endsWith("@cunima.ac.mw")) {
      showToast(
        "Access Restricted: Only official @cunima.ac.mw student Google emails are allowed to connect.",
      );
      return;
    }

    try {
      setIsLoading(true);
      await dbService.linkStudentEmail(linkingStudentId, targetEmail);
      showToast("Successfully linked student record to Google email.");
      setLinkingStudentId(null);
      setManualEmailInput("");
      await refreshDatabaseState();
    } catch (err: any) {
      showToast(`Linkage failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter & Search computation
  const filteredStudents = students.filter((s) => {
    // Status check
    const statusMatch =
      activeSubTab === "pending"
        ? s.status === "pending"
        : !s.status || s.status === "approved";

    const nameMatch =
      `${s.first_name} ${s.surname}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      s.registration_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.program_name.toLowerCase().includes(searchTerm.toLowerCase());
    const progMatch =
      programFilter === "all" || s.program_name === programFilter;
    const yearMatch = yearFilter === "all" || s.academic_year === yearFilter;
    const gendMatch =
      genderFilter === "all" ||
      s.gender.toUpperCase() === genderFilter.toUpperCase();

    return statusMatch && nameMatch && progMatch && yearMatch && gendMatch;
  });

  // Calculate stats
  const totalCount = students.length;
  const femaleCount = students.filter(
    (s) =>
      s.gender.toUpperCase() === "F" || s.gender.toUpperCase() === "FEMALE",
  ).length;
  const maleCount = totalCount - femaleCount;

  // Pagination calculation
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = filteredStudents.slice(indexOfFirstRow, indexOfLastRow);
  const totalPages = Math.max(
    1,
    Math.ceil(filteredStudents.length / rowsPerPage),
  );

  return (
    <div className="space-y-6" id="admin_students_module">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-normal text-emerald-800 dark:text-emerald-400 flex items-center gap-2">
            <Users2 className="w-6 h-6" />
            <span>Students Register</span>
          </h2>
          <p className="text-xs text-zinc-500 font-sans">
            Verify academic programs, cumulative records, and manage voter
            eligibility registers
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => {
              setIsUploadingCSV(true);
              setIsAddingSingle(false);
              setPreviewRows([]);
            }}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm shadow-emerald-500/10 transition-all active:scale-95"
            id="btn_bulk_upload_students"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Bulk CSV Import</span>
          </button>

          <button
            onClick={() => {
              setIsAddingSingle(true);
              setIsUploadingCSV(false);
            }}
            className="px-4 py-2 bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm transition-all active:scale-95"
            id="btn_add_single_student"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Student</span>
          </button>
        </div>
      </div>

      {/* METRIC CARD BAR */}
      <div
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
        id="students_analytics_dashboard"
      >
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider font-mono">
            Total Verified Register
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
              {totalCount}
            </span>
            <span className="text-xs text-emerald-500 font-semibold font-mono">
              Students
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider font-mono">
            Gender Proportion
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-bold text-zinc-800 dark:text-zinc-100">
              {maleCount} M / {femaleCount} F
            </span>
            <span className="text-xs text-zinc-500 font-mono">
              (
              {totalCount > 0
                ? Math.round((femaleCount / totalCount) * 100)
                : 0}
              % Female)
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider font-mono">
            Unique Programs
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
              {uniquePrograms.length}
            </span>
            <span className="text-xs text-zinc-400 font-mono">
              Faculties/Courses
            </span>
          </div>
        </div>
      </div>

      {/* ACTIVE MODAL: BULK CSV IMPORT */}
      {isUploadingCSV && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-md space-y-4 transition-all">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-500" />
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">
                Bulk Students CSV Upload Engine
              </h3>
            </div>
            <button
              onClick={() => {
                setIsUploadingCSV(false);
                setPreviewRows([]);
              }}
              className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${
              dragActive
                ? "border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/10"
                : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />

            <Upload className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
            <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Drag and drop your students.csv file here, or{" "}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-emerald-600 hover:text-emerald-700 font-bold underline cursor-pointer bg-transparent"
              >
                browse computer files
              </button>
            </p>
            <p className="text-[10px] text-zinc-400 mt-1 font-mono">
              Columns auto-detected: program_name, academic_year,
              registration_number, cum_number, surname, first_name, gender
            </p>
          </div>

          {/* Quick paste text area alternative */}
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider block">
              Or Paste Comma-Separated CSV Raw Rows
            </label>
            <textarea
              rows={3}
              value={csvText}
              onChange={(e) => {
                setCsvText(e.target.value);
                processCSVFile(e.target.value);
              }}
              placeholder="program_name,academic_year,registration_number,cum_number,surname,first_name,gender&#10;BSc Computer Science,2026/2027,REG001,3.8,Kandodo,Desire,M"
              className="w-full p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-mono focus:outline-none focus:border-emerald-500 text-zinc-800 dark:text-zinc-200"
            />
          </div>

          {/* Import Logs */}
          {importLogs && (
            <div
              className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
                importLogs.error
                  ? "bg-red-50 text-red-800 border-red-100 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/30"
                  : "bg-emerald-50 text-emerald-800 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30"
              }`}
            >
              {importLogs.error ? (
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              )}
              <span>{importLogs.error || importLogs.success}</span>
            </div>
          )}

          {/* CSV Preview */}
          {previewRows.length > 0 && (
            <div className="space-y-2 pt-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  Ready to Import:{" "}
                  <span className="text-emerald-600">
                    {previewRows.length} Rows Parsed
                  </span>
                </span>
                <button
                  onClick={handleImportConfirm}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg cursor-pointer transition-all active:scale-95"
                >
                  Confirm and Write to Database
                </button>
              </div>

              <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                <table className="w-full text-left text-[11px] border-collapse bg-zinc-50/50 dark:bg-zinc-950/20">
                  <thead>
                    <tr className="bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-semibold border-b border-zinc-200 dark:border-zinc-800">
                      <th className="px-3 py-1.5">First Name</th>
                      <th className="px-3 py-1.5">Surname</th>
                      <th className="px-3 py-1.5">Reg Number</th>
                      <th className="px-3 py-1.5">Program</th>
                      <th className="px-3 py-1.5">Year</th>
                      <th className="px-3 py-1.5">Gender</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.slice(0, 10).map((row, idx) => (
                      <tr
                        key={idx}
                        className="border-b border-zinc-100 dark:border-zinc-800/50 text-zinc-700 dark:text-zinc-300"
                      >
                        <td className="px-3 py-1.5 font-medium">
                          {row.first_name}
                        </td>
                        <td className="px-3 py-1.5 font-medium">
                          {row.surname}
                        </td>
                        <td className="px-3 py-1.5 font-mono text-zinc-500">
                          {row.registration_number}
                        </td>
                        <td className="px-3 py-1.5">{row.program_name}</td>
                        <td className="px-3 py-1.5">{row.academic_year}</td>
                        <td className="px-3 py-1.5 font-mono">{row.gender}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {previewRows.length > 10 && (
                  <p className="text-[10px] text-zinc-400 text-center py-1.5 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 font-mono">
                    Showing first 10 preview rows of {previewRows.length} parsed
                    records.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ACTIVE MODAL: ADD SINGLE STUDENT FORM */}
      {isAddingSingle && (
        <form
          onSubmit={handleSingleSubmit}
          className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-md space-y-4"
        >
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">
              Add Student to Database Register
            </h3>
            <button
              type="button"
              onClick={() => setIsAddingSingle(false)}
              className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-zinc-500">First Name</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="e.g. Desire"
                className="w-full px-3 py-2 bg-transparent border border-zinc-300 dark:border-zinc-700 rounded-xl focus:border-emerald-500 focus:outline-none"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-zinc-500">Surname</label>
              <input
                type="text"
                value={surname}
                onChange={(e) => setSurname(e.target.value)}
                placeholder="e.g. Kandodo"
                className="w-full px-3 py-2 bg-transparent border border-zinc-300 dark:border-zinc-700 rounded-xl focus:border-emerald-500 focus:outline-none"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-zinc-500">
                Registration Number
              </label>
              <input
                type="text"
                value={registrationNumber}
                onChange={(e) => setRegistrationNumber(e.target.value)}
                placeholder="e.g. REG/CS/2026/011"
                className="w-full px-3 py-2 bg-transparent border border-zinc-300 dark:border-zinc-700 rounded-xl focus:border-emerald-500 focus:outline-none font-mono"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-zinc-500">
                Program Name
              </label>
              <input
                type="text"
                value={programName}
                onChange={(e) => setProgramName(e.target.value)}
                placeholder="e.g. BSc Computer Science"
                className="w-full px-3 py-2 bg-transparent border border-zinc-300 dark:border-zinc-700 rounded-xl focus:border-emerald-500 focus:outline-none"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-zinc-500">
                Academic Year
              </label>
              <input
                type="text"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                placeholder="e.g. 2026/2027"
                className="w-full px-3 py-2 bg-transparent border border-zinc-300 dark:border-zinc-700 rounded-xl focus:border-emerald-500 focus:outline-none font-mono"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-zinc-500">CUM Number</label>
              <input
                type="text"
                value={cumNumber}
                onChange={(e) => setCumNumber(e.target.value)}
                placeholder="e.g. 3.75 or 76.5"
                className="w-full px-3 py-2 bg-transparent border border-zinc-300 dark:border-zinc-700 rounded-xl focus:border-emerald-500 focus:outline-none font-mono"
                required
              />
            </div>

            <div className="space-y-1 sm:col-span-2 md:col-span-1">
              <label className="font-semibold text-zinc-500">Gender</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full px-3 py-2 bg-transparent border border-zinc-300 dark:border-zinc-700 rounded-xl focus:border-emerald-500 focus:outline-none"
              >
                <option value="M">Male (M)</option>
                <option value="F">Female (F)</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-5 py-2.5 bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 text-white font-semibold rounded-full transition-colors cursor-pointer text-xs"
            >
              Save Student Record
            </button>
          </div>
        </form>
      )}

      {/* ACTIVE MODAL: MANUAL STUDENT LINKING FORM */}
      {linkingStudentId && (
        <form
          onSubmit={handleManualLinkEmail}
          className="bg-amber-50/50 dark:bg-amber-950/10 border border-amber-200 dark:border-amber-900/40 rounded-2xl p-6 shadow-md space-y-4"
        >
          <div className="flex items-center justify-between pb-3 border-b border-amber-100 dark:border-amber-900/20">
            <div className="flex items-center gap-2">
              <Link className="w-5 h-5 text-amber-500" />
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">
                Connect Google Email Manually for:{" "}
                <span className="text-amber-700 dark:text-amber-400 font-bold">
                  {students.find((s) => s.id === linkingStudentId)?.first_name}{" "}
                  {students.find((s) => s.id === linkingStudentId)?.surname}
                </span>
              </h3>
            </div>
            <button
              type="button"
              onClick={() => {
                setLinkingStudentId(null);
                setManualEmailInput("");
              }}
              className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2 max-w-md">
            <label className="text-xs font-semibold text-zinc-500">
              Google Auth Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-zinc-400 absolute left-3 top-3.5" />
              <input
                type="email"
                value={manualEmailInput}
                onChange={(e) => setManualEmailInput(e.target.value)}
                placeholder="student.name@cunima.ac.mw"
                className="w-full pl-9 pr-4 py-3.5 bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-xl focus:border-amber-500 focus:outline-none text-xs font-mono text-zinc-900 dark:text-zinc-100"
                required
              />
            </div>
            <p className="text-[10px] text-zinc-400">
              Only official @cunima.ac.mw Google emails are permitted for
              validation mapping.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-amber-100 dark:border-amber-900/20">
            <button
              type="button"
              onClick={() => {
                setLinkingStudentId(null);
                setManualEmailInput("");
              }}
              className="px-4 py-2 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-850 text-zinc-500 text-xs font-semibold rounded-full transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-amber-600 hover:bg-amber-750 text-white font-semibold rounded-full shadow-md text-xs transition-colors cursor-pointer"
            >
              Connect Email & Verify Profile
            </button>
          </div>
        </form>
      )}

      {/* FILTER CONTROLS BAR */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        {/* Search */}
        <div className="relative w-full md:max-w-xs">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search name, ID or program..."
            className="w-full pl-9 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Dropdowns */}
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          {/* Program dropdown */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-zinc-400 font-mono">Prog:</span>
            <select
              value={programFilter}
              onChange={(e) => {
                setProgramFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-2.5 py-1.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-[11px] font-semibold focus:outline-none"
            >
              <option value="all">All Programs</option>
              {uniquePrograms.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          {/* Year dropdown */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-zinc-400 font-mono">Year:</span>
            <select
              value={yearFilter}
              onChange={(e) => {
                setYearFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-2.5 py-1.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-[11px] font-semibold focus:outline-none"
            >
              <option value="all">All Years</option>
              {uniqueYears.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          {/* Gender dropdown */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-zinc-400 font-mono">Gender:</span>
            <select
              value={genderFilter}
              onChange={(e) => {
                setGenderFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-2.5 py-1.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-[11px] font-semibold focus:outline-none"
            >
              <option value="all">All Genders</option>
              <option value="M">Male (M)</option>
              <option value="F">Female (F)</option>
            </select>
          </div>
        </div>
      </div>

      {/* SUB-TABS SELECTOR */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800 my-2">
        <button
          onClick={() => {
            setActiveSubTab("verified");
            setCurrentPage(1);
          }}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
            activeSubTab === "verified"
              ? "border-emerald-600 text-emerald-700 dark:text-emerald-400 font-bold"
              : "border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
          }`}
        >
          Verified Student Directory (
          {students.filter((s) => !s.status || s.status === "approved").length})
        </button>
        <button
          onClick={() => {
            setActiveSubTab("pending");
            setCurrentPage(1);
          }}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeSubTab === "pending"
              ? "border-amber-500 text-amber-600 dark:text-amber-400 font-bold"
              : "border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
          }`}
        >
          <span>Pending Applications</span>
          <span className="bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 font-bold text-[10px] px-2 py-0.5 rounded-full font-mono">
            {students.filter((s) => s.status === "pending").length}
          </span>
        </button>
      </div>

      {/* REGISTERED STUDENTS TABLE LIST */}
      <div
        className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden"
        id="students_register_datatable"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-950 text-zinc-500 font-semibold border-b border-zinc-200 dark:border-zinc-800">
                <th className="px-5 py-3">Full Student Name</th>
                <th className="px-5 py-3">Linked Google Email</th>
                <th className="px-5 py-3">Registration ID</th>
                <th className="px-5 py-3">Program Course</th>
                <th className="px-5 py-3 text-center">Year</th>
                <th className="px-5 py-3 text-center">CUM Number</th>
                <th className="px-5 py-3 text-center">Gender</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {currentRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-zinc-400">
                    No student records match the search terms or filters.
                  </td>
                </tr>
              ) : (
                currentRows.map((student) => (
                  <tr
                    key={student.id}
                    className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20 text-zinc-800 dark:text-zinc-200 transition-colors"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full overflow-hidden border border-zinc-200 dark:border-zinc-700 bg-zinc-100 flex-shrink-0 shadow-xs">
                          <img
                            src={getUserAvatarUrl(student.gender)}
                            alt={`${student.first_name} photo`}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="font-semibold text-zinc-950 dark:text-zinc-50">
                          {student.surname}, {student.first_name}
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-3.5">
                      {student.email ? (
                        <div className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-1 rounded-lg w-fit border border-emerald-100 dark:border-emerald-900/30">
                          <Mail className="w-3 h-3 text-emerald-500" />
                          <span>{student.email}</span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-zinc-400 italic">
                          Not Connected
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-3.5 font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
                      {student.registration_number}
                    </td>

                    <td className="px-5 py-3.5">
                      <span className="text-zinc-600 dark:text-zinc-300 font-medium">
                        {student.program_name}
                      </span>
                    </td>

                    <td className="px-5 py-3.5 text-center font-mono">
                      <span className="bg-zinc-100 dark:bg-zinc-800 text-[10px] px-2 py-0.5 rounded-full font-bold">
                        {student.academic_year}
                      </span>
                    </td>

                    <td className="px-5 py-3.5 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {student.cum_number}
                    </td>

                    <td className="px-5 py-3.5 text-center font-mono font-semibold text-zinc-500">
                      {student.gender}
                    </td>

                    <td className="px-5 py-3.5 text-right flex justify-end gap-1">
                      <button
                        onClick={() => {
                          setLinkingStudentId(student.id);
                          setManualEmailInput(student.email || "");
                        }}
                        className="p-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/20 rounded-lg transition-colors cursor-pointer"
                        title="Manually connect/edit Google email"
                      >
                        <Link className="w-4 h-4" />
                      </button>
                      {student.status === "pending" && (
                        <button
                          onClick={() =>
                            handleApproveStudent(
                              student.id,
                              `${student.first_name} ${student.surname}`,
                            )
                          }
                          className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 rounded-lg transition-colors cursor-pointer"
                          title="Approve and Verify student"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() =>
                          handleDeleteStudent(
                            student.id,
                            `${student.first_name} ${student.surname}`,
                          )
                        }
                        className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors cursor-pointer"
                        title="Delete Student record"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION PANEL FOOTER */}
        {filteredStudents.length > 0 && (
          <div className="p-4 bg-zinc-50 dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs font-mono text-zinc-500">
            <span>
              Showing {indexOfFirstRow + 1} -{" "}
              {Math.min(indexOfLastRow, filteredStudents.length)} of{" "}
              {filteredStudents.length} entries
            </span>

            <div className="flex items-center gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                className="p-1 border border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-45 cursor-pointer transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                Page {currentPage} of {totalPages}
              </span>

              <button
                disabled={currentPage === totalPages}
                onClick={() =>
                  setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                }
                className="p-1 border border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-45 cursor-pointer transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
