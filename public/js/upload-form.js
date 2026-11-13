const errors = document.getElementById('upload-errors');

if (errors) errors.focus();

const form = document.querySelector('form[enctype="multipart/form-data"]');

if (form) {
  form.addEventListener('submit', () => {
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    button.textContent = 'Validating and importing…';
  });
}