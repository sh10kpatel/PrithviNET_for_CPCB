"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText, Download, Loader2 } from "lucide-react";
import { generateReport } from "@/lib/api";

export default function ReportsPage() {
  const [stationIds, setStationIds] = useState("ST001,ST002,ST003");
  const [startDate, setStartDate] = useState("2026-02-10");
  const [endDate, setEndDate] = useState("2026-03-11");
  const [format, setFormat] = useState<"pdf" | "pptx">("pdf");
  const [sections, setSections] = useState({
    aqi: true,
    water: true,
    noise: true,
    weather: true,
  });
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  const handleGenerate = async () => {
    setGenerating(true);
    setError("");

    const ids = stationIds
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (ids.length === 0) {
      setError("Please enter at least one station ID");
      setGenerating(false);
      return;
    }

    const selectedSections = Object.entries(sections)
      .filter(([, v]) => v)
      .map(([k]) => k);

    try {
      const blob = await generateReport({
        station_ids: ids,
        start_date: startDate,
        end_date: endDate,
        format,
        sections: selectedSections,
      });

      // Download the file
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `prithvinet-report-${startDate}-${endDate}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      setError(
        "Failed to generate report. Make sure the backend is running and station IDs are valid."
      );
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="container mx-auto max-w-2xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-muted-foreground">
            Generate PDF or PowerPoint environmental compliance reports
          </p>
        </div>
        <FileText className="h-8 w-8 text-muted-foreground" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Generate Report</CardTitle>
          <CardDescription>
            Select stations, date range, and format to generate a compliance report
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Station IDs */}
          <div>
            <Label>Station IDs (comma-separated)</Label>
            <Input
              value={stationIds}
              onChange={(e) => setStationIds(e.target.value)}
              placeholder="ST001, ST002, ST003"
              className="mt-1"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Enter comma-separated station IDs
            </p>
          </div>

          {/* Date range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>End Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          {/* Format */}
          <div>
            <Label>Format</Label>
            <Select value={format} onValueChange={(v) => v && setFormat(v as "pdf" | "pptx")}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">PDF Report</SelectItem>
                <SelectItem value="pptx">PowerPoint Presentation</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sections */}
          <div>
            <Label>Report Sections</Label>
            <div className="mt-2 grid grid-cols-2 gap-3">
              {Object.entries(sections).map(([key, enabled]) => (
                <div key={key} className="flex items-center gap-2">
                  <Switch
                    checked={enabled}
                    onCheckedChange={(v) =>
                      setSections((prev) => ({ ...prev, [key]: v }))
                    }
                  />
                  <span className="text-sm capitalize">{key === "aqi" ? "Air Quality" : key}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="rounded-lg bg-muted p-3">
            <p className="text-sm font-medium">Report Preview</p>
            <div className="mt-2 flex flex-wrap gap-1">
              <Badge variant="outline">
                {stationIds.split(",").filter((s) => s.trim()).length} stations
              </Badge>
              <Badge variant="outline">
                {startDate} to {endDate}
              </Badge>
              <Badge variant="outline">{format.toUpperCase()}</Badge>
              {Object.entries(sections)
                .filter(([, v]) => v)
                .map(([k]) => (
                  <Badge key={k} variant="secondary" className="capitalize">
                    {k}
                  </Badge>
                ))}
            </div>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <Button
            onClick={handleGenerate}
            disabled={generating}
            className="w-full"
            size="lg"
          >
            {generating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Generate Report
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
