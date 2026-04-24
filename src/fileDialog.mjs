import { execFileSync } from 'node:child_process';
import { platform } from 'node:os';

export function selectPdfFile() {
  if (process.env.INT_PDF_IMPORT_FILE) return process.env.INT_PDF_IMPORT_FILE;

  const os = platform();
  if (os === 'win32') return selectPdfFileWindows();
  if (os === 'darwin') return selectPdfFileMac();
  return selectPdfFileLinux();
}

function selectPdfFileWindows() {
  const script = `
Add-Type -AssemblyName System.Windows.Forms
$dialog = New-Object System.Windows.Forms.OpenFileDialog
$dialog.Filter = 'PDF files (*.pdf)|*.pdf'
$dialog.Multiselect = $false
$dialog.Title = 'Select PDF'
if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
  [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
  Write-Output $dialog.FileName
}
`.trim();
  return execFileSync('powershell.exe', ['-NoProfile', '-STA', '-Command', script], { encoding: 'utf8' }).trim() || null;
}

function selectPdfFileMac() {
  const script = 'POSIX path of (choose file of type {"com.adobe.pdf"} with prompt "Select PDF")';
  try {
    return execFileSync('osascript', ['-e', script], { encoding: 'utf8' }).trim() || null;
  } catch (error) {
    if (isMacUserCancel(error)) return null;
    throw error;
  }
}

export function isMacUserCancel(error) {
  const text = `${error?.message ?? ''}\n${error?.stderr?.toString?.() ?? ''}`;
  return text.includes('-128') || /user canceled/i.test(text) || /User canceled/i.test(text);
}

function selectPdfFileLinux() {
  try {
    return execFileSync('zenity', ['--file-selection', '--title=Select PDF', '--file-filter=PDF files | *.pdf'], {
      encoding: 'utf8'
    }).trim() || null;
  } catch {
    return null;
  }
}
