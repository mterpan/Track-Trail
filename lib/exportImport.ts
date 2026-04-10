import JSZip from 'jszip';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { getApplications, getStatusEvents, getAttachments, getContacts, saveApplication, saveStatusEvent, saveAttachment, saveContact, clearAllData, Application, StatusEvent, Attachment, Contact, ApplicationStatus } from './db';
import { auth } from './firebase';

export async function exportData() {
  const zip = new JSZip();
  
  const applications = await getApplications();
  const contacts = await getContacts();
  
  // Create Excel Workbook with ExcelJS for styling
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Track & Trail';
  workbook.lastModifiedBy = 'Track & Trail';
  workbook.created = new Date();
  workbook.modified = new Date();

  const THEME_COLOR = 'D97757'; // App's orange theme
  const HEADER_STYLE: Partial<ExcelJS.Style> = {
    font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${THEME_COLOR}` } },
    alignment: { vertical: 'middle', horizontal: 'center' },
    border: {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    }
  };

  const getStatusStyle = (status: string): Partial<ExcelJS.Style> => {
    let color = '6B665E'; // Default gray
    let bgColor = 'F5F5F5';

    switch (status) {
      case 'Applied':
        color = '1D4ED8'; // Blue-700
        bgColor = 'EFF6FF'; // Blue-50
        break;
      case 'Interviewing':
        color = '7E22CE'; // Purple-700
        bgColor = 'FAF5FF'; // Purple-50
        break;
      case 'Offer':
      case 'Accepted':
        color = '15803D'; // Green-700
        bgColor = 'F0FDF4'; // Green-50
        break;
      case 'Rejected':
        color = 'B91C1C'; // Red-700
        bgColor = 'FEF2F2'; // Red-50
        break;
    }

    return {
      font: { color: { argb: `FF${color}` }, bold: true },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${bgColor}` } },
      alignment: { horizontal: 'center' },
      border: {
        top: { style: 'thin', color: { argb: `FF${color}40` } },
        left: { style: 'thin', color: { argb: `FF${color}40` } },
        bottom: { style: 'thin', color: { argb: `FF${color}40` } },
        right: { style: 'thin', color: { argb: `FF${color}40` } }
      }
    };
  };

  // Sheet 1: Job Application Log
  const wsApps = workbook.addWorksheet('Job Application Log');
  wsApps.columns = [
    { header: 'ID', key: 'id', width: 15 },
    { header: 'Company', key: 'company', width: 25 },
    { header: 'Job Title', key: 'title', width: 30 },
    { header: 'URL', key: 'url', width: 40 },
    { header: 'Date Applied', key: 'dateApplied', width: 15 },
    { header: 'Current Status', key: 'status', width: 15 },
    { header: 'Notes', key: 'notes', width: 50 }
  ];

  wsApps.getRow(1).eachCell((cell) => {
    cell.style = HEADER_STYLE as ExcelJS.Style;
  });

  applications.forEach(app => {
    const row = wsApps.addRow({
      id: app.id,
      company: app.company,
      title: app.title,
      url: app.url || '',
      dateApplied: app.dateApplied,
      status: app.status,
      notes: app.notes || ''
    });

    // Style the status cell
    const statusCell = row.getCell('status');
    statusCell.style = getStatusStyle(app.status) as ExcelJS.Style;
    
    // Add border to all cells in row
    row.eachCell((cell) => {
      if (!cell.style.border) {
        cell.border = {
          bottom: { style: 'thin', color: { argb: 'FFE8E4DC' } }
        };
      }
    });
  });

  // Sheet 2: Status History
  const wsEvents = workbook.addWorksheet('Status History');
  wsEvents.columns = [
    { header: 'Application ID', key: 'appId', width: 15 },
    { header: 'Company', key: 'company', width: 25 },
    { header: 'Job Title', key: 'title', width: 30 },
    { header: 'Status', key: 'status', width: 15 },
    { header: 'Date', key: 'date', width: 15 },
    { header: 'Notes', key: 'notes', width: 50 }
  ];

  wsEvents.getRow(1).eachCell((cell) => {
    cell.style = HEADER_STYLE as ExcelJS.Style;
  });

  const allEventsCount: number[] = [0]; // Use array to pass by reference for counting
  for (const app of applications) {
    const events = await getStatusEvents(app.id);
    events.forEach(ev => {
      const row = wsEvents.addRow({
        appId: ev.applicationId,
        company: app.company,
        title: app.title,
        status: ev.status,
        date: ev.date,
        notes: ev.notes || ''
      });
      row.getCell('status').style = getStatusStyle(ev.status) as ExcelJS.Style;
      allEventsCount[0]++;
    });
  }

  // Sheet 3: Attachments
  const wsAttachments = workbook.addWorksheet('Attachments');
  wsAttachments.columns = [
    { header: 'Application ID', key: 'appId', width: 15 },
    { header: 'Company', key: 'company', width: 25 },
    { header: 'Job Title', key: 'title', width: 30 },
    { header: 'File Name', key: 'name', width: 30 },
    { header: 'Type', key: 'type', width: 20 },
    { header: 'Size (bytes)', key: 'size', width: 15 }
  ];

  wsAttachments.getRow(1).eachCell((cell) => {
    cell.style = HEADER_STYLE as ExcelJS.Style;
  });

  const attachmentsFolder = zip.folder('attachments');
  let totalAttachments = 0;
  
  for (const app of applications) {
    const attachments = await getAttachments(app.id);
    if (attachments.length > 0) {
      const safeCompany = app.company.replace(/[^a-z0-9]/gi, '_');
      const safeTitle = app.title.replace(/[^a-z0-9]/gi, '_');
      const folderName = `${safeCompany}_-_${safeTitle}`;
      const appFolder = attachmentsFolder?.folder(folderName);
      
      for (const att of attachments) {
        wsAttachments.addRow({
          appId: att.applicationId,
          company: app.company,
          title: app.title,
          name: att.name,
          type: att.type,
          size: att.size
        });
        
        // Convert base64 back to Uint8Array for ZIP
        const binaryString = window.atob(att.data);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        appFolder?.file(att.name, bytes);
        totalAttachments++;
      }
    }
  }

  // Sheet 4: Contacts
  const wsContacts = workbook.addWorksheet('Contacts');
  wsContacts.columns = [
    { header: 'ID', key: 'id', width: 15 },
    { header: 'Name', key: 'name', width: 25 },
    { header: 'Company', key: 'company', width: 25 },
    { header: 'Role', key: 'role', width: 25 },
    { header: 'Email', key: 'email', width: 30 },
    { header: 'Phone', key: 'phone', width: 20 },
    { header: 'Date Contacted', key: 'dateContacted', width: 15 },
    { header: 'Notes', key: 'notes', width: 50 }
  ];

  wsContacts.getRow(1).eachCell((cell) => {
    cell.style = HEADER_STYLE as ExcelJS.Style;
  });

  contacts.forEach(c => {
    wsContacts.addRow({
      id: c.id,
      name: c.name,
      company: c.company,
      role: c.role || '',
      email: c.email || '',
      phone: c.phone || '',
      dateContacted: c.dateContacted,
      notes: c.notes || ''
    });
  });

  // Sheet 5: Summary
  const wsSummary = workbook.addWorksheet('Summary');
  wsSummary.columns = [
    { header: 'Metric', key: 'metric', width: 30 },
    { header: 'Value', key: 'value', width: 15 }
  ];

  wsSummary.getRow(1).eachCell((cell) => {
    cell.style = HEADER_STYLE as ExcelJS.Style;
  });

  const summaryRows = [
    { metric: 'Total Applications', value: applications.length },
    { metric: 'Total Status Events', value: allEventsCount[0] },
    { metric: 'Total Attachments', value: totalAttachments },
    { metric: 'Total Contacts', value: contacts.length }
  ];

  summaryRows.forEach(row => {
    const r = wsSummary.addRow(row);
    r.getCell('metric').font = { bold: true };
    r.getCell('value').alignment = { horizontal: 'center' };
  });

  // Generate Excel file
  const excelBuffer = await workbook.xlsx.writeBuffer();
  
  // Add Excel to ZIP
  const dateStr = new Date().toISOString().split('T')[0];
  zip.file(`Job_Applications_${dateStr}.xlsx`, excelBuffer);
  
  // Add README
  const readmeContent = `TRACK&TRAIL — JOB APPLICATION EXPORT
==========================================

Export Date:          ${dateStr}
Total Applications:   ${applications.length}
Total Status Events:  ${allEventsCount[0]}
Total Attachments:    ${totalAttachments}

CONTENTS
--------
  Job_Applications_${dateStr}.xlsx
    Sheet 1 — Job Application Log:  all applications with full detail
    Sheet 2 — Status History:       complete timeline of every status change
    Sheet 3 — Attachments:          index of all uploaded documents
    Sheet 4 — Contacts:             index of all inbound contacts
    Sheet 5 — Summary:              overview statistics

  attachments/
    One sub-folder per application, named Company_-_Position.
    Contains all documents uploaded to that application
    (resumes, cover letters, offer letters, emails, screenshots, etc.).

This export package can be used to demonstrate active job-seeking activity
for unemployment benefits, government programs, or personal records.`;
  zip.file('README.txt', readmeContent);
  
  // Generate and save ZIP
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  saveAs(zipBlob, `TrackAndTrail_Export_${dateStr}.zip`);
}

export async function importData(file: File): Promise<{ success: boolean; logs: string[]; stats: { apps: number; events: number; contacts: number; attachments: number; errors: number } }> {
  const logs: string[] = [];
  const stats = { apps: 0, events: 0, contacts: 0, attachments: 0, errors: 0 };
  
  const log = (msg: string) => {
    console.log(msg);
    logs.push(`[${new Date().toLocaleTimeString()}] ${msg}`);
  };
  const logError = (msg: string) => {
    console.error(msg);
    logs.push(`[${new Date().toLocaleTimeString()}] ERROR: ${msg}`);
    stats.errors++;
  };

  try {
    const user = auth.currentUser;
    if (!user) throw new Error("You must be logged in to import data.");
    
    log(`Starting import process for user: ${user.email} (${user.uid})`);
    const zip = new JSZip();
    const loadedZip = await zip.loadAsync(file);
    log('ZIP loaded successfully');
    
    const excelFileMatch = Object.keys(loadedZip.files).find(name => 
      name.toLowerCase().endsWith('.xlsx') && !name.includes('__MACOSX')
    );
    
    if (!excelFileMatch) {
      logError('Excel file not found in ZIP');
      throw new Error('Could not find the Job Applications Excel file in the ZIP.');
    }
    
    log(`Found Excel file: ${excelFileMatch}`);
    const excelData = await loadedZip.files[excelFileMatch].async('arraybuffer');
    const wb = XLSX.read(excelData, { type: 'array', cellDates: true });
    
    log(`Excel sheets found: ${wb.SheetNames.join(', ')}`);
    
    log('Clearing existing data...');
    await clearAllData();
    log('Data cleared');
    
    const formatDate = (val: any): string => {
      if (!val) return new Date().toISOString().split('T')[0];
      if (val instanceof Date) return val.toISOString().split('T')[0];
      if (typeof val === 'number') {
        const date = new Date(Math.round((val - 25569) * 86400 * 1000));
        return date.toISOString().split('T')[0];
      }
      return String(val);
    };

    const getVal = (row: any, ...keys: (string | undefined)[]) => {
      for (const key of keys) {
        if (key && row[key] !== undefined && row[key] !== null && row[key] !== '') return row[key];
      }
      return undefined;
    };

    const getSheet = (name: string) => {
      const actualName = wb.SheetNames.find(n => n.toLowerCase() === name.toLowerCase());
      return actualName ? wb.Sheets[actualName] : null;
    };

    const appIdMap = new Map<string, string>(); // Excel ID -> Firestore ID
    const appNameMap = new Map<string, string>(); // Company|Title -> Firestore ID

    // Import Applications
    const wsApps = getSheet('Job Application Log');
    if (wsApps) {
      const appsData: any[] = XLSX.utils.sheet_to_json(wsApps);
      log(`Found ${appsData.length} rows in Applications sheet`);
      
      // Find the header row to map columns
      let headerRow = appsData.find(row => 
        Object.values(row).some(v => String(v).toLowerCase() === 'company')
      );
      
      // If we found a header row, let's try to map the __EMPTY keys
      const mapping: Record<string, string> = {};
      if (headerRow) {
        Object.entries(headerRow).forEach(([key, val]) => {
          const sVal = String(val).toLowerCase();
          if (sVal === 'company') mapping.company = key;
          if (sVal === 'position' || sVal === 'job title') mapping.title = key;
          if (sVal === 'status' || sVal === 'current status') mapping.status = key;
          if (sVal === 'date applied') mapping.dateApplied = key;
          if (sVal === 'job url' || sVal === 'url') mapping.url = key;
          if (sVal === 'notes') mapping.notes = key;
          if (sVal === '#' || sVal === 'id' || sVal.includes('exported')) mapping.id = key;
        });
        log(`Mapped application columns: ${JSON.stringify(mapping)}`);
      }

      for (const row of appsData) {
        // Skip header rows or summary rows
        const firstVal = String(Object.values(row)[0]);
        if (firstVal.includes('Total Applications') || firstVal === '#' || firstVal === 'ID' || firstVal === 'Company' || firstVal.includes('Exported')) continue;

        try {
          const excelId = String(getVal(row, mapping.id, 'ID', 'id') || '');
          const company = String(getVal(row, mapping.company, 'Company', 'company') || 'Unknown');
          const title = String(getVal(row, mapping.title, 'Job Title', 'Position', 'title') || 'Unknown');
          const firestoreId = crypto.randomUUID();

          if (excelId) appIdMap.set(excelId, firestoreId);
          appNameMap.set(`${company}|${title}`, firestoreId);

          const app: Application = {
            id: firestoreId,
            userId: user.uid,
            company,
            title,
            url: getVal(row, mapping.url, 'Job URL', 'URL', 'url'),
            dateApplied: formatDate(getVal(row, mapping.dateApplied, 'Date Applied', 'dateApplied')),
            status: (getVal(row, mapping.status, 'Current Status', 'Status', 'status') as ApplicationStatus) || 'Applied',
            notes: getVal(row, mapping.notes, 'Notes', 'notes'),
            createdAt: Date.now(),
            updatedAt: Date.now()
          };
          
          // Clean undefined values for Firestore
          const cleanApp = JSON.parse(JSON.stringify(app));
          await saveApplication(cleanApp);
          stats.apps++;
        } catch (e) {
          logError(`Failed to import application row: ${JSON.stringify(row)}. Error: ${e}`);
        }
      }
    } else {
      log('Warning: "Job Application Log" sheet not found');
    }
    
    // Import Status Events
    const wsEvents = getSheet('Status History');
    if (wsEvents) {
      const eventsData: any[] = XLSX.utils.sheet_to_json(wsEvents);
      log(`Found ${eventsData.length} rows in Status History sheet`);

      let headerRow = eventsData.find(row => 
        Object.values(row).some(v => String(v).toLowerCase() === 'event' || String(v).toLowerCase() === 'status')
      );

      const mapping: Record<string, string> = {};
      if (headerRow) {
        Object.entries(headerRow).forEach(([key, val]) => {
          const sVal = String(val).toLowerCase();
          if (sVal === 'application id' || sVal.includes('exported')) mapping.appId = key;
          if (sVal === 'company') mapping.company = key;
          if (sVal === 'position' || sVal === 'job title') mapping.title = key;
          if (sVal === 'status' || sVal === 'to status' || sVal === 'event') mapping.status = key;
          if (sVal === 'date') mapping.date = key;
          if (sVal === 'notes') mapping.notes = key;
        });
        log(`Mapped status event columns: ${JSON.stringify(mapping)}`);
      }

      for (const row of eventsData) {
        const firstVal = String(Object.values(row)[0]);
        if (firstVal.includes('Status History') || firstVal === '#' || firstVal === 'Company' || firstVal.includes('Exported')) continue;

        try {
          const excelAppId = String(getVal(row, mapping.appId, 'Application ID', 'applicationId') || '');
          const company = String(getVal(row, mapping.company, 'Company', 'company') || '');
          const title = String(getVal(row, mapping.title, 'Job Title', 'Position', 'title') || '');
          
          let firestoreAppId = appIdMap.get(excelAppId);
          if (!firestoreAppId) {
            firestoreAppId = appNameMap.get(`${company}|${title}`);
          }

          if (!firestoreAppId) {
            log(`Warning: Could not link status event to application: ${company} - ${title}`);
            continue;
          }

          const rawStatus = getVal(row, mapping.status, 'Status', 'To Status', 'status');
          const validStatuses = ['Draft', 'Applied', 'Interviewing', 'Offer', 'Rejected', 'Accepted', 'Withdrawn'];
          
          // If status is "—" or invalid, skip this event as it's likely a "Details Updated" log without a status change
          if (!rawStatus || !validStatuses.includes(String(rawStatus))) {
            log(`Skipping non-status event for ${company}: ${getVal(row, '__EMPTY_2', 'Event') || 'Unknown event'}`);
            continue;
          }

          const event: StatusEvent = {
            id: crypto.randomUUID(),
            userId: user.uid,
            applicationId: firestoreAppId,
            status: rawStatus as ApplicationStatus,
            date: formatDate(getVal(row, mapping.date, 'Date', 'date')),
            notes: getVal(row, mapping.notes, 'Notes', 'notes'),
            createdAt: Date.now()
          };
          const cleanEvent = JSON.parse(JSON.stringify(event));
          await saveStatusEvent(cleanEvent);
          stats.events++;
        } catch (e) {
          logError(`Failed to import status event row: ${JSON.stringify(row)}. Error: ${e}`);
        }
      }
    } else {
      log('Warning: "Status History" sheet not found');
    }
    
    // Import Contacts
    const wsContacts = getSheet('Contacts');
    if (wsContacts) {
      const contactsData: any[] = XLSX.utils.sheet_to_json(wsContacts);
      log(`Found ${contactsData.length} rows in Contacts sheet`);

      let headerRow = contactsData.find(row => 
        Object.values(row).some(v => String(v).toLowerCase() === 'name')
      );

      const mapping: Record<string, string> = {};
      if (headerRow) {
        Object.entries(headerRow).forEach(([key, val]) => {
          const sVal = String(val).toLowerCase();
          if (sVal === 'name') mapping.name = key;
          if (sVal === 'company') mapping.company = key;
          if (sVal === 'role') mapping.role = key;
          if (sVal === 'email') mapping.email = key;
          if (sVal === 'phone') mapping.phone = key;
          if (sVal === 'date contacted') mapping.dateContacted = key;
          if (sVal === 'notes') mapping.notes = key;
          if (sVal === 'id') mapping.id = key;
        });
      }

      for (const row of contactsData) {
        const firstVal = String(Object.values(row)[0]);
        if (firstVal.includes('Contacts') || firstVal === '#' || firstVal === 'ID' || firstVal === 'Name' || firstVal.includes('Exported')) continue;

        try {
          const contact: Contact = {
            id: String(getVal(row, mapping.id, 'ID', 'id') || crypto.randomUUID()),
            userId: user.uid,
            name: String(getVal(row, mapping.name, 'Name', 'name') || 'Unknown'),
            company: String(getVal(row, mapping.company, 'Company', 'company') || 'Unknown'),
            role: getVal(row, mapping.role, 'Role', 'role') || null,
            email: getVal(row, mapping.email, 'Email', 'email') || null,
            phone: getVal(row, mapping.phone, 'Phone', 'phone') || null,
            dateContacted: formatDate(getVal(row, mapping.dateContacted, 'Date Contacted', 'dateContacted')),
            notes: getVal(row, mapping.notes, 'Notes', 'notes') || null,
            createdAt: Date.now()
          };
          const cleanContact = JSON.parse(JSON.stringify(contact));
          await saveContact(cleanContact);
          stats.contacts++;
        } catch (e) {
          logError(`Failed to import contact row: ${JSON.stringify(row)}. Error: ${e}`);
        }
      }
    } else {
      log('Warning: "Contacts" sheet not found');
    }
    
    // Import Attachments
    const wsAttachments = getSheet('Attachments');
    if (wsAttachments) {
      const attachmentsData: any[] = XLSX.utils.sheet_to_json(wsAttachments);
      log(`Found ${attachmentsData.length} rows in Attachments sheet`);

      let headerRow = attachmentsData.find(row => 
        Object.values(row).some(v => String(v).toLowerCase() === 'file name' || String(v).toLowerCase() === 'filename')
      );

      const mapping: Record<string, string> = {};
      if (headerRow) {
        Object.entries(headerRow).forEach(([key, val]) => {
          const sVal = String(val).toLowerCase();
          if (sVal === 'application id' || sVal.includes('exported') || sVal === 'id') mapping.appId = key;
          if (sVal === 'company' || sVal === 'employer') mapping.company = key;
          if (sVal === 'job title' || sVal === 'position' || sVal === 'title') mapping.title = key;
          if (sVal === 'file name' || sVal === 'filename' || sVal === 'file') mapping.fileName = key;
          if (sVal === 'type' || sVal === 'content type') mapping.type = key;
          if (sVal === 'size (bytes)' || sVal === 'size') mapping.size = key;
        });
        log(`Mapped attachment columns: ${JSON.stringify(mapping)}`);
      }

      // Log all files in the ZIP for debugging
      const allZipFiles = Object.keys(loadedZip.files).filter(f => !f.includes('__MACOSX') && !loadedZip.files[f].dir);
      log(`Total files in ZIP: ${allZipFiles.length}`);
      if (allZipFiles.length > 0) {
        log(`Sample files in ZIP: ${allZipFiles.slice(0, 15).join(', ')}`);
      }

      for (const row of attachmentsData) {
        const firstVal = String(Object.values(row)[0]);
        if (firstVal.includes('Attachments') || firstVal === '#' || firstVal === 'Application ID' || firstVal.includes('Exported')) continue;

        try {
          // Try to get values from mapped columns OR common names directly
          const excelAppId = String(getVal(row, mapping.appId, 'Application ID', 'applicationId', 'id') || '');
          const company = String(getVal(row, mapping.company, 'Company', 'company', 'employer') || '');
          const title = String(getVal(row, mapping.title, 'Job Title', 'Position', 'title') || '');
          const fileName = String(getVal(row, mapping.fileName, 'File Name', 'fileName', 'filename', 'file') || '');
          const type = String(getVal(row, mapping.type, 'Type', 'type') || 'application/octet-stream');
          const size = Number(getVal(row, mapping.size, 'Size (bytes)', 'size') || 0);
          
          if (!fileName || fileName === 'undefined' || fileName === 'null' || fileName === '') continue;

          let firestoreAppId = appIdMap.get(excelAppId);
          if (!firestoreAppId) {
            // Try matching by company and title (case-insensitive and trimmed)
            const searchKey = `${company.trim().toLowerCase()}|${title.trim().toLowerCase()}`;
            for (const [key, val] of appNameMap.entries()) {
              if (key.toLowerCase() === searchKey) {
                firestoreAppId = val;
                break;
              }
            }
          }

          // If still not found, try matching by just company (if title is missing or generic)
          if (!firestoreAppId && company) {
            const companyLower = company.trim().toLowerCase();
            for (const [key, val] of appNameMap.entries()) {
              if (key.toLowerCase().startsWith(companyLower + '|')) {
                firestoreAppId = val;
                break;
              }
            }
          }

          if (!firestoreAppId) {
            log(`Warning: Could not link attachment to application: ${company} - ${title} (File: ${fileName})`);
            continue;
          }

          const safeCompany = company.replace(/[^a-z0-9]/gi, '_');
          const safeTitle = title.replace(/[^a-z0-9]/gi, '_');
          const folderName = `${safeCompany}_-_${safeTitle}`;
          
          // Deep search for the file in the ZIP
          let fileInZip = null;
          
          // 1. Try exact paths first (case-insensitive)
          const possiblePaths = [
            `attachments/${folderName}/${fileName}`,
            `${folderName}/${fileName}`,
            `attachments/${fileName}`,
            fileName
          ];
          
          for (const path of possiblePaths) {
            const normalizedPath = path.replace(/\\/g, '/').toLowerCase();
            const match = allZipFiles.find(k => 
              k.replace(/\\/g, '/').toLowerCase().endsWith(normalizedPath)
            );
            if (match) {
              fileInZip = loadedZip.files[match];
              break;
            }
          }

          // 2. If not found, search for just the filename anywhere in the ZIP (loose match)
          if (!fileInZip) {
            const lowerFileName = fileName.toLowerCase().trim();
            const match = allZipFiles.find(k => {
              const parts = k.replace(/\\/g, '/').split('/');
              const actualFileName = parts[parts.length - 1].toLowerCase().trim();
              return actualFileName === lowerFileName || actualFileName.includes(lowerFileName) || lowerFileName.includes(actualFileName);
            });
            if (match) {
              fileInZip = loadedZip.files[match];
              log(`Found file via loose deep search: ${match} for ${fileName}`);
            }
          }

          if (fileInZip) {
            const buffer = await fileInZip.async('uint8array');
            
            // Convert Uint8Array to base64 string for Firestore
            let binary = '';
            const len = buffer.byteLength;
            for (let i = 0; i < len; i++) {
              binary += String.fromCharCode(buffer[i]);
            }
            const base64Data = window.btoa(binary);

            // Detect type from filename if it's generic
            let finalType = type;
            const ext = fileName.split('.').pop()?.toLowerCase();
            const mimeMap: Record<string, string> = {
              'pdf': 'application/pdf',
              'doc': 'application/msword',
              'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              'png': 'image/png',
              'jpg': 'image/jpeg',
              'jpeg': 'image/jpeg',
              'gif': 'image/gif',
              'webp': 'image/webp',
              'svg': 'image/svg+xml',
              'txt': 'text/plain',
              'csv': 'text/csv'
            };

            if (!finalType || finalType === 'application/octet-stream' || finalType === 'undefined') {
              if (ext && mimeMap[ext]) finalType = mimeMap[ext];
            }

            const attachment: Attachment = {
              id: crypto.randomUUID(),
              userId: user.uid,
              applicationId: firestoreAppId,
              name: fileName,
              type: finalType || 'application/octet-stream',
              size: buffer.length,
              data: base64Data,
              createdAt: Date.now()
            };
            await saveAttachment(attachment);
            stats.attachments++;
          } else {
            log(`Warning: Could not find file in ZIP: ${fileName} (Expected in: ${folderName})`);
          }
        } catch (e) {
          logError(`Failed to import attachment row: ${JSON.stringify(row)}. Error: ${e}`);
        }
      }
    } else {
      log('Warning: "Attachments" sheet not found');
    }

    log(`Import finished. Successes: ${stats.apps} apps, ${stats.events} events, ${stats.contacts} contacts, ${stats.attachments} attachments. Errors: ${stats.errors}`);
    return { success: stats.errors === 0, logs, stats };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    logError(`Import failed: ${errorMsg}`);
    return { success: false, logs, stats };
  }
}
