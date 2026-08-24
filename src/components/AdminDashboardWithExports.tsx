import { useState } from 'react';
import { Download, FileText } from 'lucide-react';
import { AdminDashboard } from './AdminDashboard';
import { downloadLiveFinalistsSummaryPdf } from '../lib/finalistExport';

interface Props {
  logo: string | null;
  onLogoChange: (logo: string | null) => void;
  onLogout: () => void;
}

export function AdminDashboardWithExports(props: Props) {
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');

  async function exportLiveFinalistsPdf() {
    setExporting(true);
    setExportError('');
    try {
      await downloadLiveFinalistsSummaryPdf();
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Could not export Live Finals PDF.');
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      <AdminDashboard {...props} />
      <div className="admin-export-widget">
        <button type="button" className="primary-button" onClick={exportLiveFinalistsPdf} disabled={exporting}>
          {exporting ? <FileText size={18} /> : <Download size={18} />}
          {exporting ? 'Preparing Live Finals PDF...' : 'Export Live Finals Summary PDF'}
        </button>
        {exportError && <div className="admin-export-error">{exportError}</div>}
      </div>
    </>
  );
}
