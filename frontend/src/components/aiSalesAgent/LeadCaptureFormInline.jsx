import { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const LeadCaptureFormInline = ({
  labels,
  lead,
  onSubmit,
  isSubmitting,
  compact = false,
}) => {
  const [formState, setFormState] = useState({
    fullName: lead?.fullName || "",
    email: lead?.email || "",
    phone: lead?.phone || "",
    preferredLanguage: lead?.preferredLanguage || "en",
  });
  const [error, setError] = useState("");

  useEffect(() => {
    setFormState((previousState) => ({
      ...previousState,
      fullName: lead?.fullName || previousState.fullName,
      email: lead?.email || previousState.email,
      phone: lead?.phone || previousState.phone,
      preferredLanguage: lead?.preferredLanguage || previousState.preferredLanguage,
    }));
  }, [lead]);

  const languageOptions = useMemo(
    () => [
      { value: "en", label: "English" },
      { value: "tr", label: "Türkçe" },
      { value: "ru", label: "Русский" },
      { value: "ar", label: "العربية" },
    ],
    []
  );

  const handleChange = (field, value) => {
    setFormState((previousState) => ({
      ...previousState,
      [field]: value,
    }));
    if (error) setError("");
  };

  const validateForm = () => {
    if (!formState.fullName.trim()) {
      setError(labels.nameRequired);
      return false;
    }
    if (!formState.email.trim() || !EMAIL_REGEX.test(formState.email.trim())) {
      setError(labels.emailRequired || labels.contactRequired);
      return false;
    }
    setError("");
    return true;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validateForm()) return;

    setError("");
    const result = await onSubmit(formState);
    if (result?.success === false) {
      setError(result.error || labels.leadSubmitRetry || labels.contactRequired);
      return;
    }
    setError("");
  };

  if (compact) {
    return (
      <div className="rounded-[24px] border border-emerald-100 bg-[linear-gradient(180deg,#ffffff_0%,#f6fffb_100%)] p-3 shadow-[0_16px_34px_-28px_rgba(16,185,129,0.45)]">
        <div className="mb-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
            {labels.leadFormTitle}
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            {labels.leadFormSubtitle}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-2">
          <input
            value={formState.fullName}
            onChange={(event) => handleChange("fullName", event.target.value)}
            placeholder={labels.fullName}
            className="h-11 w-full rounded-[20px] border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
          />
          <input
            type="email"
            value={formState.email}
            onChange={(event) => handleChange("email", event.target.value)}
            placeholder={labels.email}
            className="h-11 w-full rounded-[20px] border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
          />
          <input
            value={formState.phone}
            onChange={(event) => handleChange("phone", event.target.value)}
            placeholder={labels.phone}
            className="h-11 w-full rounded-[20px] border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
          />
          <select
            value={formState.preferredLanguage}
            onChange={(event) =>
              handleChange("preferredLanguage", event.target.value)
            }
            className="h-11 w-full rounded-[20px] border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
          >
            {languageOptions.map((item) => (
              <option key={item.value} value={item.value}>
                {labels.preferredLanguage}: {item.label}
              </option>
            ))}
          </select>

          {error ? <p className="text-xs font-medium text-rose-600">{error}</p> : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex h-12 w-full items-center justify-center rounded-[20px] bg-[linear-gradient(135deg,#10b981_0%,#0f766e_100%)] text-sm font-semibold text-white shadow-[0_18px_32px_-24px_rgba(16,185,129,0.95)] transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-70"
          >
            {labels.submitLead}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="rounded-[24px] border border-emerald-100 bg-[linear-gradient(180deg,#ffffff_0%,#f6fffb_100%)] p-4 shadow-[0_18px_40px_-34px_rgba(16,185,129,0.55)]">
      <div className="mb-3">
        <p className="text-sm font-semibold text-slate-900">{labels.leadFormTitle}</p>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          {labels.leadFormSubtitle}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          value={formState.fullName}
          onChange={(event) => handleChange("fullName", event.target.value)}
          placeholder={labels.fullName}
          className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
        />
        <input
          type="email"
          value={formState.email}
          onChange={(event) => handleChange("email", event.target.value)}
          placeholder={labels.email}
          className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input
            value={formState.phone}
            onChange={(event) => handleChange("phone", event.target.value)}
            placeholder={labels.phone}
            className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
          />
          <select
            value={formState.preferredLanguage}
            onChange={(event) =>
              handleChange("preferredLanguage", event.target.value)
            }
            className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
          >
            {languageOptions.map((item) => (
              <option key={item.value} value={item.value}>
                {labels.preferredLanguage}: {item.label}
              </option>
            ))}
          </select>
        </div>

        {error ? <p className="text-xs font-medium text-rose-600">{error}</p> : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-2xl bg-[linear-gradient(135deg,#10b981_0%,#0f766e_100%)] px-4 py-3 text-sm font-semibold text-white shadow-[0_18px_32px_-24px_rgba(16,185,129,0.95)] transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-70"
        >
          {labels.submitLead}
        </button>
      </form>
    </div>
  );
};

LeadCaptureFormInline.propTypes = {
  labels: PropTypes.object.isRequired,
  lead: PropTypes.object,
  onSubmit: PropTypes.func.isRequired,
  isSubmitting: PropTypes.bool,
  compact: PropTypes.bool,
};

export default LeadCaptureFormInline;
