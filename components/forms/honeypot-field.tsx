import { HONEYPOT_FIELD_NAME } from "@/lib/security/honeypot";

/**
 * Hidden field real visitors never see or fill in. Place anywhere
 * inside a <form> that posts to a server action protected by
 * lib/security/honeypot.ts's assertHoneypotEmpty().
 */
export function HoneypotField() {
  return (
    <div
      aria-hidden="true"
      className="absolute left-[-9999px] top-[-9999px]"
    >
      <label htmlFor={HONEYPOT_FIELD_NAME}>
        Leave this field blank
      </label>
      <input
        id={HONEYPOT_FIELD_NAME}
        name={HONEYPOT_FIELD_NAME}
        type="text"
        tabIndex={-1}
        autoComplete="off"
      />
    </div>
  );
}
