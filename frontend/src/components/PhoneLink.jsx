import PropTypes from "prop-types";
import { buildTelHref } from "../utils/common";

/**
 * Renders a semantic <a href="tel:..."> for GTM click-to-call tracking.
 * Returns null when no phone value is provided, and falls back to a
 * non-clickable <span> if the value cannot be normalised to a valid tel: href.
 */
const PhoneLink = ({ phone, children, className, ...rest }) => {
  if (!phone) return null;

  const href = buildTelHref(phone);

  if (!href) {
    return (
      <span className={className} {...rest}>
        {children}
      </span>
    );
  }

  return (
    <a
      href={href}
      className={`phone-click-link ${className || ""}`.trim()}
      data-contact-type="phone"
      data-track="click-to-call"
      {...rest}
    >
      {children}
    </a>
  );
};

PhoneLink.propTypes = {
  phone: PropTypes.string,
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
};

export default PhoneLink;
