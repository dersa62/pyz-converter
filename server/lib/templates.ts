export const standardTemplate = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Helvetica', sans-serif; color: #0f172a; }
    .header { display: flex; justify-content: space-between; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 2px solid #E2E8F0; }
    .brand h1 { margin: 0; color: #162B4D; }
    .meta { text-align: right; }
    .parties { display: flex; justify-content: space-between; margin-bottom: 40px; }
    .party { width: 45%; }
    .party h3 { color: #1E5D7A; font-size: 0.9em; text-transform: uppercase; border-bottom: 1px solid #E2E8F0; padding-bottom: 5px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    th { text-align: left; padding: 10px; background: #f9fafb; border-bottom: 1px solid #E2E8F0; font-size: 0.9em; text-transform: uppercase; color: #1E5D7A; }
    td { padding: 10px; border-bottom: 1px solid #E2E8F0; }
    .totals { width: 300px; margin-left: auto; }
    .total-row { display: flex; justify-content: space-between; padding: 5px 0; }
    .grand-total { font-weight: bold; font-size: 1.2em; border-top: 2px solid #162B4D; margin-top: 10px; padding-top: 10px; color: #162B4D; }
    .footer { margin-top: 50px; font-size: 0.8em; color: #64748b; text-align: center; border-top: 1px solid #E2E8F0; padding-top: 20px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand">
      <h1>{{labels.invoice}}</h1>
    </div>
    <div class="meta">
      <p><strong>{{labels.invoiceNo}}:</strong> {{invoiceNumber}}</p>
      <p><strong>{{labels.date}}:</strong> {{formatDate issueDate}}</p>
    </div>
  </div>

  <div class="parties">
    <div class="party">
      <h3>{{labels.from}}</h3>
      <p><strong>{{supplier.name}}</strong></p>
      <p>{{supplier.address}}</p>
      <p>{{supplier.city}}, {{supplier.country}}</p>
      <p>{{supplier.email}}</p>
    </div>
    <div class="party">
      <h3>{{labels.billTo}}</h3>
      <p><strong>{{customer.name}}</strong></p>
      <p>{{customer.address}}</p>
      <p>{{customer.city}}, {{customer.country}}</p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>{{labels.description}}</th>
        <th>{{labels.qty}}</th>
        <th>{{labels.unitPrice}}</th>
        <th>{{labels.tax}}</th>
        <th>{{labels.total}}</th>
      </tr>
    </thead>
    <tbody>
      {{#each lines}}
      <tr>
        <td>{{description}}</td>
        <td>{{quantity}} {{unit}}</td>
        <td>{{formatCurrency unitPrice ../currencyCode}}</td>
        <td>%{{taxRate}}</td>
        <td>{{formatCurrency total ../currencyCode}}</td>
      </tr>
      {{/each}}
    </tbody>
  </table>

  <div class="totals">
    <div class="total-row">
      <span>{{labels.subtotal}}:</span>
      <span>{{formatCurrency totals.lineExtensionAmount currencyCode}}</span>
    </div>
    <div class="total-row">
      <span>{{labels.tax}}:</span>
      <span>{{formatCurrency totals.taxTotal currencyCode}}</span>
    </div>
    <div class="total-row grand-total">
      <span>{{labels.grandTotal}}:</span>
      <span>{{formatCurrency totals.payableAmount currencyCode}}</span>
    </div>
  </div>

  {{#if notes}}
  <div class="notes">
    <h3>{{labels.notes}}</h3>
    <ul>
      {{#each notes}}
        <li>{{this}}</li>
      {{/each}}
    </ul>
  </div>
  {{/if}}

  <div class="footer">
    {{labels.disclaimer}}
  </div>
</body>
</html>
`;

export const minimalTemplate = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Courier New', monospace; color: #000; }
    .header { text-align: center; margin-bottom: 40px; border-bottom: 1px dashed #000; padding-bottom: 20px; }
    h1 { font-size: 1.5em; margin: 0; }
    .parties { display: flex; justify-content: space-between; margin-bottom: 40px; }
    .party { width: 45%; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    th { text-align: left; border-bottom: 1px solid #000; padding: 5px; }
    td { padding: 5px; }
    .totals { margin-top: 20px; border-top: 1px solid #000; padding-top: 10px; }
    .total-row { display: flex; justify-content: space-between; }
    .grand-total { font-weight: bold; }
    .disclaimer { margin-top: 50px; font-size: 0.8em; font-style: italic; }
  </style>
</head>
<body>
  <div class="header">
    <h1>{{labels.invoice}}</h1>
    <p>#{{invoiceNumber}} | {{formatDate issueDate}}</p>
  </div>

  <div class="parties">
    <div class="party">
      <strong>{{labels.from}}:</strong><br>
      {{supplier.name}}<br>
      {{supplier.city}}
    </div>
    <div class="party">
      <strong>{{labels.billTo}}:</strong><br>
      {{customer.name}}<br>
      {{customer.city}}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>{{labels.description}}</th>
        <th>{{labels.qty}}</th>
        <th>{{labels.total}}</th>
      </tr>
    </thead>
    <tbody>
      {{#each lines}}
      <tr>
        <td>{{description}}</td>
        <td>{{quantity}}</td>
        <td>{{formatCurrency total ../currencyCode}}</td>
      </tr>
      {{/each}}
    </tbody>
  </table>

  <div class="totals">
    <div class="total-row grand-total">
      <span>{{labels.grandTotal}}:</span>
      <span>{{formatCurrency totals.payableAmount currencyCode}}</span>
    </div>
  </div>

  <div class="disclaimer">
    {{labels.disclaimer}}
  </div>
</body>
</html>
`;
