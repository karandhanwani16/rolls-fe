import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { customersAPI, paymentsInAPI } from "@/services/api";
import { getRegularCustomers, getWatavVendors } from "@/lib/partyTypes";
import { useToast } from "@/components/ui/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import {
  Loader2,
  Clock3,
  Search,
  FilterX,
  Check,
  ChevronsUpDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const formatAmount = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0);

const PendingWatav = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [byWatav, setByWatav] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedVendor, setSelectedVendor] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [entryTypeFilter, setEntryTypeFilter] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  const [vendorOpen, setVendorOpen] = useState(false);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [vendorSearch, setVendorSearch] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [collectionDate, setCollectionDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [collecting, setCollecting] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    fetchPending();
  }, [startDate, endDate, selectedVendor, entryTypeFilter]);

  const fetchCustomers = async () => {
    try {
      const data = await customersAPI.getAll();
      setCustomers(data || []);
    } catch (error) {
      console.error("Error fetching customers:", error);
    }
  };

  const fetchPending = async () => {
    try {
      setLoading(true);
      setSelectedIds([]);
      const data = await paymentsInAPI.getWatavReport({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        watavCustomerId: selectedVendor || undefined,
        collectionStatus: "PENDING",
        entryType: entryTypeFilter === "ALL" ? undefined : entryTypeFilter,
      });
      setTransactions(data.data || []);
      setByWatav(data.byWatav || []);
      setSummary(data.summary || null);
    } catch (error) {
      console.error("Error fetching pending watav:", error);
      toast({
        title: "Error",
        description: "Failed to fetch pending Watav entries",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const watavVendors = useMemo(() => getWatavVendors(customers), [customers]);

  const payingCustomers = useMemo(
    () => getRegularCustomers(customers),
    [customers]
  );

  const filteredVendorOptions = watavVendors.filter(
    (c) =>
      c.name.toLowerCase().includes(vendorSearch.toLowerCase()) ||
      c.phone?.toLowerCase().includes(vendorSearch.toLowerCase())
  );

  const filteredCustomerOptions = payingCustomers.filter(
    (c) =>
      c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.phone?.toLowerCase().includes(customerSearch.toLowerCase())
  );

  const selectedVendorName =
    customers.find((c) => c.id === selectedVendor)?.name || "All vendors";
  const selectedCustomerName =
    selectedCustomer === "__NONE__"
      ? "Standalone only (no customer)"
      : customers.find((c) => c.id === selectedCustomer)?.name || "All customers";

  const filteredTransactions = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return transactions.filter((item) => {
      if (selectedCustomer) {
        if (selectedCustomer === "__NONE__") {
          if (item.entryType !== "STANDALONE" && item.actualCustomerId) return false;
        } else if (item.actualCustomerId !== selectedCustomer) {
          return false;
        }
      }
      if (!q) return true;
      return (
        item.watavCustomerName?.toLowerCase().includes(q) ||
        item.actualCustomerName?.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q) ||
        item.type?.toLowerCase().includes(q)
      );
    });
  }, [transactions, selectedCustomer, searchTerm]);

  const filteredSummary = useMemo(() => {
    const rows = filteredTransactions;
    return {
      entries: rows.length,
      gross: rows.reduce((s, r) => s + (r.receivedAmount || 0), 0),
      charges: rows.reduce((s, r) => s + (r.vendorCharges || 0), 0),
      net: rows.reduce((s, r) => s + (r.netAmount || 0), 0),
      customerLinkedGross: rows
        .filter((r) => r.entryType === "CUSTOMER_PAYMENT")
        .reduce((s, r) => s + (r.receivedAmount || 0), 0),
      standaloneGross: rows
        .filter((r) => r.entryType === "STANDALONE")
        .reduce((s, r) => s + (r.receivedAmount || 0), 0),
    };
  }, [filteredTransactions]);

  const clearFilters = () => {
    setStartDate("");
    setEndDate("");
    setSelectedVendor("");
    setSelectedCustomer("");
    setEntryTypeFilter("ALL");
    setSearchTerm("");
    setSelectedIds([]);
  };

  const hasActiveFilters =
    !!startDate ||
    !!endDate ||
    !!selectedVendor ||
    !!selectedCustomer ||
    entryTypeFilter !== "ALL" ||
    !!searchTerm;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (
      selectedIds.length > 0 &&
      selectedIds.length === filteredTransactions.length
    ) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredTransactions.map((t) => t.id));
    }
  };

  const handleCollect = async () => {
    if (selectedIds.length === 0) return;
    try {
      setCollecting(true);
      await paymentsInAPI.collect({
        ids: selectedIds,
        collection_date: collectionDate,
      });
      toast({
        title: "Collected",
        description: `Marked ${selectedIds.length} pending entr${
          selectedIds.length === 1 ? "y" : "ies"
        } as collected.`,
      });
      await fetchPending();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to mark entries as collected",
        variant: "destructive",
      });
    } finally {
      setCollecting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center">
              <Clock3 className="mr-2" /> Pending Watav
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Money still sitting with Watav vendors — filter, select, and mark as collected
            </p>
          </div>
          {hasActiveFilters && (
            <Button variant="outline" size="sm" onClick={clearFilters}>
              <FilterX className="mr-2 h-4 w-4" />
              Clear filters
            </Button>
          )}
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">From date</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">To date</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Watav vendor</label>
              <Popover open={vendorOpen} onOpenChange={setVendorOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between font-normal"
                  >
                    <span className="truncate">{selectedVendorName}</span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[260px] p-0">
                  <Command>
                    <CommandInput
                      placeholder="Search vendor..."
                      value={vendorSearch}
                      onValueChange={setVendorSearch}
                    />
                    <CommandEmpty>No vendors found.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        onSelect={() => {
                          setSelectedVendor("");
                          setVendorOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            !selectedVendor ? "opacity-100" : "opacity-0"
                          )}
                        />
                        All vendors
                      </CommandItem>
                      {filteredVendorOptions.map((customer) => (
                        <CommandItem
                          key={customer.id}
                          onSelect={() => {
                            setSelectedVendor(customer.id);
                            setVendorOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedVendor === customer.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {customer.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Customer</label>
              <Popover open={customerOpen} onOpenChange={setCustomerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between font-normal"
                  >
                    <span className="truncate">{selectedCustomerName}</span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[260px] p-0">
                  <Command>
                    <CommandInput
                      placeholder="Search customer..."
                      value={customerSearch}
                      onValueChange={setCustomerSearch}
                    />
                    <CommandEmpty>No customers found.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        onSelect={() => {
                          setSelectedCustomer("");
                          setCustomerOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            !selectedCustomer ? "opacity-100" : "opacity-0"
                          )}
                        />
                        All customers
                      </CommandItem>
                      <CommandItem
                        onSelect={() => {
                          setSelectedCustomer("__NONE__");
                          setCustomerOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedCustomer === "__NONE__" ? "opacity-100" : "opacity-0"
                          )}
                        />
                        Standalone only (no customer)
                      </CommandItem>
                      {filteredCustomerOptions.map((customer) => (
                        <CommandItem
                          key={customer.id}
                          onSelect={() => {
                            setSelectedCustomer(customer.id);
                            setCustomerOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedCustomer === customer.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {customer.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Entry type</label>
              <Select value={entryTypeFilter} onValueChange={setEntryTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Entry type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All entry types</SelectItem>
                  <SelectItem value="CUSTOMER_PAYMENT">Customer-linked</SelectItem>
                  <SelectItem value="STANDALONE">Standalone</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Vendor, customer, notes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm p-4 border">
            <div className="text-sm text-muted-foreground">Pending entries</div>
            <div className="text-2xl font-semibold mt-1">{filteredSummary.entries}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 border">
            <div className="text-sm text-muted-foreground">Pending gross</div>
            <div className="text-2xl font-semibold mt-1 text-amber-800">
              {formatAmount(filteredSummary.gross)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Customer {formatAmount(filteredSummary.customerLinkedGross)} · Standalone{" "}
              {formatAmount(filteredSummary.standaloneGross)}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 border">
            <div className="text-sm text-muted-foreground">Vendor charges</div>
            <div className="text-2xl font-semibold mt-1 text-amber-700">
              {formatAmount(filteredSummary.charges)}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 border">
            <div className="text-sm text-muted-foreground">Net to collect</div>
            <div className="text-2xl font-bold mt-1 text-amber-900">
              {formatAmount(filteredSummary.net)}
            </div>
          </div>
        </div>

        {!selectedVendor && byWatav.length > 0 && !searchTerm && !selectedCustomer && (
          <div className="rounded-md border overflow-hidden bg-white">
            <div className="bg-sidebar px-4 py-2 text-white text-sm font-medium">
              Pending by vendor
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendor</TableHead>
                  <TableHead className="text-right">Entries</TableHead>
                  <TableHead className="text-right">Gross</TableHead>
                  <TableHead className="text-right">Charges</TableHead>
                  <TableHead className="text-right">Net pending</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {byWatav.map((row) => (
                  <TableRow
                    key={row.watavCustomerId}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedVendor(row.watavCustomerId)}
                  >
                    <TableCell className="font-medium">{row.watavCustomerName}</TableCell>
                    <TableCell className="text-right">{row.pendingEntries}</TableCell>
                    <TableCell className="text-right">
                      {formatAmount(row.pendingGross)}
                    </TableCell>
                    <TableCell className="text-right text-amber-700">
                      {formatAmount(row.pendingCharges)}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-amber-800">
                      {formatAmount(row.pendingNet)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {filteredTransactions.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 rounded-md border bg-amber-50/70 p-3">
            <Checkbox
              checked={
                selectedIds.length > 0 &&
                selectedIds.length === filteredTransactions.length
              }
              onCheckedChange={toggleSelectAll}
            />
            <span className="text-sm">
              {selectedIds.length} of {filteredTransactions.length} selected
            </span>
            <Input
              type="date"
              value={collectionDate}
              onChange={(e) => setCollectionDate(e.target.value)}
              className="w-[160px]"
            />
            <Button
              size="sm"
              disabled={selectedIds.length === 0 || collecting}
              onClick={handleCollect}
              className="bg-brand-teal hover:bg-teal-700"
            >
              {collecting ? "Collecting..." : "Mark Collected"}
            </Button>
            {selectedIds.length > 0 && (
              <span className="text-sm font-medium text-amber-900">
                Net selected:{" "}
                {formatAmount(
                  filteredTransactions
                    .filter((t) => selectedIds.includes(t.id))
                    .reduce((s, t) => s + (t.netAmount || 0), 0)
                )}
              </span>
            )}
          </div>
        )}

        <div className="rounded-md border overflow-hidden bg-white">
          {loading ? (
            <div className="flex justify-center items-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10" />
                  <TableHead>Date</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Entry</TableHead>
                  <TableHead className="text-right">Gross</TableHead>
                  <TableHead className="text-right">Discount</TableHead>
                  <TableHead className="text-right">Settles</TableHead>
                  <TableHead className="text-right">Charges</TableHead>
                  <TableHead className="text-right">Net</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.length > 0 ? (
                  filteredTransactions.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.includes(item.id)}
                          onCheckedChange={() => toggleSelect(item.id)}
                        />
                      </TableCell>
                      <TableCell>
                        {format(new Date(item.date), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell className="font-medium">{item.watavCustomerName}</TableCell>
                      <TableCell>
                        {item.actualCustomerName || (
                          <span className="italic text-muted-foreground">None</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.entryType === "STANDALONE" ? "Standalone" : "Customer"}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatAmount(item.receivedAmount)}
                      </TableCell>
                      <TableCell className="text-right">
                        {(item.discount || 0) > 0 ? formatAmount(item.discount) : "—"}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {item.entryType === "STANDALONE"
                          ? "—"
                          : formatAmount(item.customerSettled ?? item.receivedAmount + (item.discount || 0))}
                      </TableCell>
                      <TableCell className="text-right text-amber-700">
                        {formatAmount(item.vendorCharges)}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatAmount(item.netAmount)}
                      </TableCell>
                      <TableCell className="max-w-[180px] truncate text-muted-foreground">
                        {item.description || "—"}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={11} className="h-24 text-center text-muted-foreground">
                      No pending Watav entries match these filters
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>

        {summary?.pending && !hasActiveFilters && (
          <p className="text-xs text-muted-foreground">
            Showing all pending Watav entries currently with vendors.
          </p>
        )}
      </div>
    </DashboardLayout>
  );
};

export default PendingWatav;
