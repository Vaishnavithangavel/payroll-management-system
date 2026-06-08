import { Link } from "react-router-dom";

function PageNavigation({ previous, next }) {
  return (
    <div className="page-navigation">
      {previous ? (
        <Link to={previous.path} className="nav-button">
          ← {previous.label}
        </Link>
      ) : (
        <div />
      )}

      {next && (
        <Link to={next.path} className="nav-button">
          {next.label} →
        </Link>
      )}
    </div>
  );
}

export default PageNavigation;