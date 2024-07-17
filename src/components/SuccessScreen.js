import React from 'react';
import PropTypes from 'prop-types';
import './SuccessScreen.css';

const SuccessScreen = ({ onGoBack }) => {
  return (
    <div className="form-container">
      <h2>Success!</h2>
      <p>Your process has been successfully completed.</p>
      <button className="go-back-button" onClick={onGoBack}>Go Back</button>
    </div>
  );
};

SuccessScreen.propTypes = {
  onGoBack: PropTypes.func.isRequired,
};

export default SuccessScreen;

